pub mod slog_middleware {
    use std::env::var;
    use std::future::{ready, Ready};

    use actix_web::dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform};
    use actix_web::Error;
    use futures::future::LocalBoxFuture;
    use slog::{info, o, Logger};

    pub struct SlogLogger {
        logger: Logger,
    }

    impl SlogLogger {
        pub fn new(logger: Logger) -> Self {
            SlogLogger { logger }
        }
    }

    impl<S, B> Transform<S, ServiceRequest> for SlogLogger
    where
        S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
        S::Future: 'static,
        B: 'static,
    {
        type Response = ServiceResponse<B>;
        type Error = Error;
        type Transform = SlogLoggerMiddleware<S>;
        type InitError = ();
        type Future = Ready<Result<Self::Transform, Self::InitError>>;

        fn new_transform(&self, service: S) -> Self::Future {
            ready(Ok(SlogLoggerMiddleware {
                service,
                logger: SlogLogger::new(self.logger.clone()).logger,
            }))
        }
    }

    pub struct SlogLoggerMiddleware<S> {
        service: S,
        logger: Logger,
    }

    impl<S, B> Service<ServiceRequest> for SlogLoggerMiddleware<S>
    where
        S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
        S::Future: 'static,
        B: 'static,
    {
        type Response = ServiceResponse<B>;
        type Error = Error;
        type Future = LocalBoxFuture<'static, Result<Self::Response, Self::Error>>;

        forward_ready!(service);

        fn call(&self, req: ServiceRequest) -> Self::Future {
            let start = std::time::Instant::now();
            let headers: Vec<_> = req
                .headers()
                .iter()
                .map(|(k, v)| {
                    (
                        k.as_str().to_owned(),
                        v.to_str().unwrap_or("[INVALID UTF-8]").to_owned(),
                    )
                })
                .collect();
            let mut logger = self.logger.clone();
            let fut = self.service.call(req);
            Box::pin(async move {
                let res = fut.await?;
                let elapsed = start.elapsed();
                // print headers only if configured to do so
                if var("SLOG_LOG_HEADERS").unwrap_or("false".to_string()) == "true" {
                    for (key, value) in headers {
                        logger = logger.new(o!("header" => format!("{}: {}", key, value)));
                    }
                }
                info!(logger, "http request"; "latency" => elapsed.as_millis(),
                    "method" => res.request().method().as_str(), "path" => res.request().path(),
                    "status" => res.status().as_u16());

                Ok(res)
            })
        }
    }
}
