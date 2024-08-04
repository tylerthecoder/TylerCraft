struct FireballEntity {
    pos: FineWorldPos,
    vel: Velocity,
    life: u8,
}

#[wasm_bindgen]
#[derive(Clone, Deserialize, Serialize)]
struct Projectile {
    pos: FineWorldPos,
}

impl Entity for Projectile {
    fn update(&mut self, world: &World) -> () {
        todo!()
    }

    fn perform_action(&mut self, action: EntityAction) -> () {
        todo!()
    }

    fn id(&self) -> u32 {
        todo!()
    }
}
