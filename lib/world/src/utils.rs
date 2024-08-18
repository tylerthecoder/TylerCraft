


pub fn js_log(s: &str) {
    use wasm_bindgen::JsValue;
    web_sys::console::log_1(&JsValue::from_str(s));
}