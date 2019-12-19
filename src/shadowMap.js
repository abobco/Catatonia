class ShadowMap {
    constructor(lights, tileMap, renderer) {
        let shaper = new PIXI.Graphics();
        this.mesh = new PIXI.Graphics();
        let blurSize = 32;

        let tileSize = tileMap.tileSize
        let w = tileMap.w;
        let h = tileMap.h;
        const bounds = new PIXI.Rectangle(-tileSize/2, -tileSize/2, 
                                          w*tileSize , h*tileSize );

        //const bounds = new PIXI.Rectangle(-tileSize/2, -tileSize/2, 4000,4000);

        shaper.beginFill(0xFFFFFF,1);
        shaper.drawRect(-tileSize/2, -tileSize/2, 
                        w*tileSize , h*tileSize );
        shaper.endFill();


        lights.forEach( (light) => {
            light.lightContainer.children.forEach( (mesh) =>{
                let geometry = mesh.geometry;

                let vertices = geometry.getBuffer("aVertexPosition").data;
                console.log(vertices);
                
                shaper.beginFill(0, 1);
                shaper.moveTo(vertices[0], vertices[1]);
                shaper.lineTo(vertices[2], vertices[3]);
                shaper.lineTo(vertices[4], vertices[5]);
                shaper.lineTo(vertices[0], vertices[1]);
                shaper.endFill();

            });
        });
        // shaper.filters = [new PIXI.filters.BlurFilter(blurSize)]

        const texture = renderer.generateTexture(shaper, PIXI.SCALE_MODES.NEAREST, 1, bounds);
        this.focus = new PIXI.Sprite(texture);
        this.focus.x = -tileSize/2;
        this.focus.y = -tileSize/2;

        this.mesh.beginFill(0x000000, 0.4);
        this.mesh.drawRect(-tileSize/2, -tileSize/2, 
                            w*tileSize , h*tileSize);
        this.mesh.endFill();

        this.mesh.mask = this.focus;
    }
}

export {ShadowMap}