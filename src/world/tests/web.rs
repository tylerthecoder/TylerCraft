//! Test suite for the Web and headless browsers.

#![cfg(target_arch = "wasm32")]

extern crate wasm_bindgen_test;
use wasm_bindgen_test::*;

extern crate world;
use world::Chunk;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn stores_block() {
    let mut chunk = Chunk::new();

    chunk.add_block(4, 0, 0, 1);

    let block = chunk.get_block(4, 0, 0);

    assert_eq!(block, 1);
}

#[wasm_bindgen_test]
fn stores_first_block() {
    let mut chunk = Chunk::new();
    chunk.add_block(0, 0, 0, 1);

    let block = chunk.get_block(0, 0, 0);

    assert_eq!(block, 1);
}

#[wasm_bindgen_test]
fn stores_last_block() {
    let mut chunk = Chunk::new();
    chunk.add_block(15, 63, 15, 1);

    let block = chunk.get_block(15, 63, 15);

    assert_eq!(block, 1);
}

#[wasm_bindgen_test]
fn deletes_blocks() {
    let mut chunk = Chunk::new();

    chunk.add_block(1, 2, 3, 1);

    chunk.remove_block(1, 2, 3);

    let block = chunk.get_block(1, 2, 3);

    assert_eq!(block, 0)
}

