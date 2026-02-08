pub fn js_log(s: &str) {
    if cfg!(target_arch = "wasm32") {
        use wasm_bindgen::JsValue;
        web_sys::console::log_1(&JsValue::from_str(s));
    }
}
