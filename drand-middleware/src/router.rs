pub mod routes {
    use actix_web::{get, post, put, web, HttpResponse, Responder, ResponseError};
    use slog::{debug, error, info};
    // use serde_json::json;

    use crate::{
        drand::{get_drand_beacon, is_querying_pending_beacon, send_pending_beacon_report},
        errors::CheckerError,
        models::structs::{AppState, DrandEnv, RequestRollups, Timestamp},
        rollup::server::{send_finish_and_retrieve_input, send_report},
        utils::{
            self,
            util::{load_env_from_memory, write_env_to_json},
        },
    };

    #[put("/update_drand_config")]
    async fn update_drand_config(
        ctx: web::Data<AppState>,
        body: web::Json<DrandEnv>,
    ) -> Result<impl Responder, impl ResponseError> {
        debug!(ctx.logger, "Received update_drand_config request from DApp");

        let _ = ctx.input_buffer_manager.lock().await;

        let drand = body.into_inner();

        let result = write_env_to_json().await;

        if let Err(e) = result {
            error!(ctx.logger, "Error updating drand config: {}", e);
            return Err(CheckerError::InvalidDrandConfig {
                cause: e.to_string(),
            });
        }

        load_env_from_memory(drand).await;

        Ok(HttpResponse::NoContent().finish())
    }

    #[post("/finish")]
    async fn consume_buffer(
        ctx: web::Data<AppState>,
        body: web::Json<RequestRollups>,
    ) -> impl Responder {
        // let logger = ctx.logger.clone();
        let logger = utils::util::configure_log(Some("debug".to_string()));
        debug!(logger, "Received finish request from DApp {:?}", body);

        // the DApp consume from the buffer first
        if let Some(item) = ctx.consume_input().await {
            debug!(logger, "Found input on buffer, using it");
            let request = item.request.clone();
            return HttpResponse::Ok().body(request);
            // match RollupInput::try_from(item) {
            //     Ok(input) => {
            //         // if has_input_inside_input(&input) {
            //         return HttpResponse::Ok().body(request);
            //         // } else {
            //         //     return HttpResponse::Accepted().finish();
            //         // }
            //     }

            //     Err(_) => return HttpResponse::Accepted().finish(),
            // }
        }
        let rollup_input = match send_finish_and_retrieve_input("accept").await {
            Ok(input) => input,
            Err(_) => return HttpResponse::Accepted().finish(),
        };
        debug!(logger, "Rollup input received: {:?}", rollup_input);
        match rollup_input.request_type.as_str() {
            "advance_state" => {
                debug!(logger, "Rollup input request type: advance_state");
                ctx.set_inspecting(false).await;
                if let Ok(beacon) = get_drand_beacon(&rollup_input.data.payload) {
                    debug!(logger, "Is Drand!!! {:?}", beacon);
                    ctx.keep_newest_beacon(beacon);
                }
            }
            "inspect_state" => {
                debug!(logger, "Rollup input request type: inspect_state");
                ctx.set_inspecting(true).await;
                if is_querying_pending_beacon(&rollup_input).unwrap() {
                    send_pending_beacon_report(&ctx).await;

                    // This is a specific inspect, so we omit it from the DApp
                    return HttpResponse::Accepted().finish();
                }
            }
            &_ => {
                debug!(
                    logger,
                    "Rollup input request type: {:?}", rollup_input.request_type
                );
                error!(logger, "Unknown request type");
            }
        };
        debug!(
            logger,
            "Rollup input request type: {:?}", rollup_input.request_type
        );
        // Dispatch the input to the DApp
        debug!(logger, "Sending input to DApp: {:?}", rollup_input);
        HttpResponse::Ok().json(rollup_input)
        // if has_input_inside_input(&rollup_input) {
        //     info!("Has input inside input, sending to DApp");
        //     HttpResponse::Ok().json(rollup_input)
        // } else {
        //     info!("No input inside input, skipping");
        //     HttpResponse::Accepted().finish()
        // }
    }

    #[get("/random")]
    async fn request_random(
        ctx: web::Data<AppState>,
        query: web::Query<Timestamp>,
    ) -> Result<impl Responder, impl ResponseError> {
        let logger = utils::util::configure_log(Some("debug".to_string()));
        // let logger = ctx.logger.clone();
        debug!(
            logger,
            "Received random request from DApp timestamp={}", query.timestamp
        );
        let randomness: Option<String> = ctx.get_randomness_for_timestamp(query.timestamp);
        if let Some(randomness) = randomness {
            info!(logger, "Randomness already found: {:?}", randomness);
            // we already have the randomness to continue the process
            return Ok(HttpResponse::Ok().body(randomness));
        }
        if ctx.is_inspecting() {
            debug!(
                logger,
                "When inspecting we do not call finish from /random endpoint."
            );
            return Err(CheckerError::AlreadyInspecting);
        }
        // call finish to halt and wait the beacon
        debug!(logger, "Calling finish to halt and wait the beacon");
        let rollup_input = match send_finish_and_retrieve_input("accept").await {
            Ok(input) => input,
            Err(e) => {
                error!(logger, "Error sending finish request: {}", e);
                return Err(CheckerError::SendRollupAndRetrieveInputError);
            }
        };
        info!(logger, "Rollup input received: {:?}", rollup_input);
        match rollup_input.request_type.as_str() {
            "advance_state" => {
                debug!(logger, "Rollup input request type: advance_state");
                ctx.set_inspecting(false).await;
                // Store the input in the buffer, so that it can be accessed from the /finish endpoint.
                let err = ctx.store_input(&rollup_input).await;

                if let Err(e) = err {
                    error!(logger, "Error storing input: {}", e);
                    return Err(CheckerError::StoreInputError);
                }
                debug!(logger, "Getting Drand beacon");
                match get_drand_beacon(&rollup_input.data.payload) {
                    Ok(beacon) => {
                        debug!(logger, "Is Drand!!! {:?}", beacon);
                        ctx.keep_newest_beacon(beacon);
                        let randomness = ctx.get_randomness_for_timestamp(query.timestamp);
                        if let Some(randomness) = randomness {
                            return Ok(HttpResponse::Ok().body(randomness));
                        }
                        Err(CheckerError::RandomnessError)
                    }
                    Err(e) => {
                        error!(logger, "Error getting randomness: {}", e);
                        Err(CheckerError::SignatureErrorBeacon)
                    }
                }
            }
            "inspect_state" => {
                debug!(logger, "Rollup input request type: inspect_state");
                ctx.set_inspecting(true).await;
                if is_querying_pending_beacon(&rollup_input).unwrap() {
                    debug!(logger, "Is querying pending beacon");
                    send_pending_beacon_report(&ctx).await;

                    // This is a specific inspect, so we omit it from the DApp
                    Err(CheckerError::ByPassInspect)
                } else {
                    // Store the input in the buffer, so that it can be accessed from the /finish endpoint.
                    debug!(logger, "Storing input in the buffer");
                    ctx.store_input(&rollup_input).await;
                    Err(CheckerError::StoreInputByPass)
                }
            }
            &_ => {
                error!(logger, "Unknown request type");
                Err(CheckerError::UnknownRequestType)
            }
        }
    }

    // forward report requests to the rollup server
    #[post("/report")]
    async fn forward_report_to_rollup(
        ctx: web::Data<AppState>,
        body: web::Json<serde_json::Value>,
    ) -> impl Responder {
        debug!(ctx.logger, "Received report request from DApp");
        let report = body.into_inner();
        let rollup_response = send_report(report).await.unwrap();
        let body_bytes = hyper::body::to_bytes(rollup_response.into_body())
            .await
            .unwrap();
        HttpResponse::Ok().body(body_bytes)
    }
}
