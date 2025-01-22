mod drand;
mod errors;
mod main_test;
mod models;
mod rollup;
mod router;
mod utils;

use crate::models::structs::AppState;
use crate::router::routes;
use crate::utils::util::load_env_from_json;
use actix_web::{web, App, HttpServer};

use actix_slog::StructuredLogger;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    load_env_from_json().await.unwrap();

    let app_state = web::Data::new(AppState::new());

    info!("Starting server");

    HttpServer::new(move || {
        App::new()
            .wrap(StructuredLogger::new(app_state.logger.clone()))
            .app_data(app_state.clone())
            .service(routes::request_random)
            .service(routes::consume_buffer)
            .service(routes::update_drand_config)
            .service(routes::forward_report_to_rollup)
    })
    .bind(("0.0.0.0", 3000))?
    .run()
    .await
}
