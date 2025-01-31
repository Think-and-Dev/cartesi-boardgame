
## Tips

```shell
cargo watch -x 'test -- --nocapture --test-threads=1'
```

```shell
cargo watch -x 'test <partial_test_name> -- --nocapture --test-threads=1'
```

```shell
cargo watch -x 'test with_input -- --nocapture --test-threads=1'
```

## Run with debug logs enabled
```shell
SLOG_LEVEL=debug cargo run
```