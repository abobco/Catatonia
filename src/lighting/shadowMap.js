export class ShadowMap {
    constructor(lights, tileMap, renderer) {
        let shaper = new PIXI.Graphics();
        this.mesh = new PIXI.Graphics();
        let blurSize = 32;
        this.tileMap = tileMap;

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
                
                for ( let i = 0; i < vertices.length - 5; i += 4 ){
                    shaper.beginFill(0, 1);
                    shaper.moveTo(vertices[i + 0], vertices[i + 1]);
                    shaper.lineTo(vertices[i + 2], vertices[i + 3]);
                    shaper.lineTo(vertices[i + 4], vertices[i + 5]);
                    shaper.lineTo(vertices[i + 0], vertices[i + 1]);
                    shaper.endFill();
                }
   

            });
        });
        // shaper.filters = [new PIXI.filters.BlurFilter(blurSize)]

        const texture = renderer.generateTexture(shaper, PIXI.SCALE_MODES.NEAREST, 1, bounds);
        this.focus = new PIXI.Sprite(texture);
        this.focus.x = -tileSize/2;
        this.focus.y = -tileSize/2;

        this.mesh.beginFill(0x000000, 0.35);
        this.mesh.drawRect(-tileSize/2, -tileSize/2, 
                            w*tileSize , h*tileSize);
        this.mesh.endFill();

        this.mesh.mask = this.focus;
    }
}

export class CulledShadowMap {
    constructor(lights, tileMap, renderer, cameraPos ) {
        let shaper = new PIXI.Graphics();
        this.mesh = new PIXI.Graphics();
        let blurSize = 32;
        this.tileMap = tileMap;

        let tileSize = tileMap.tileSize
        let w = tileMap.w;
        let h = tileMap.h;
        const bounds = new PIXI.Rectangle(cameraPos.x - window.innerWidth, cameraPos.y - window.innerHeight , 
                                          window.innerWidth*2 , window.innerHeight*2 );

        //const bounds = new PIXI.Rectangle(-tileSize/2, -tileSize/2, 4000,4000);

        shaper.beginFill(0xFFFFFF,1);
        shaper.drawRect(bounds.x, bounds.y, 
            bounds.width , bounds.height);
        shaper.endFill();


        lights.forEach( (light) => {
            light.lightContainer.children.forEach( (mesh) =>{
                let geometry = mesh.geometry;

                let vertices = geometry.getBuffer("aVertexPosition").data;
                
                for ( let i = 0; i < vertices.length - 5; i += 4 ){
                    shaper.beginFill(0, 1);
                    shaper.moveTo(vertices[i + 0], vertices[i + 1]);
                    shaper.lineTo(vertices[i + 2], vertices[i + 3]);
                    shaper.lineTo(vertices[i + 4], vertices[i + 5]);
                    shaper.lineTo(vertices[i + 0], vertices[i + 1]);
                    shaper.endFill();
                }
   

            });
        });
        // shaper.filters = [new PIXI.filters.BlurFilter(blurSize)]

        const texture = renderer.generateTexture(shaper, PIXI.SCALE_MODES.NEAREST, 1, bounds);
        this.focus = new PIXI.Sprite(texture);
        //this.focus.x = -tileSize/2;
        //this.focus.y = -tileSize/2;
        this.focus.x += bounds.x;
        this.focus.y += bounds.y;
        this.mesh.beginFill(0x000000, 0.35);
        this.mesh.drawRect(bounds.x, bounds.y, 
                            bounds.width , bounds.height);
        this.mesh.endFill();

        this.mesh.mask = this.focus;
    }

    update(lights, renderer, cameraPos){
        let shaper = new PIXI.Graphics();
        const bounds = new PIXI.Rectangle(cameraPos.x - window.innerWidth, cameraPos.y - window.innerHeight , 
                                          window.innerWidth*2 , window.innerHeight*2 );

        //const bounds = new PIXI.Rectangle(-tileSize/2, -tileSize/2, 4000,4000);

        shaper.beginFill(0xFFFFFF,1);
        shaper.drawRect(bounds.x, bounds.y, 
            bounds.width , bounds.height);
        shaper.endFill();


        lights.forEach( (light) => {
            light.lightContainer.children.forEach( (mesh) =>{
                let geometry = mesh.geometry;

                let vertices = geometry.getBuffer("aVertexPosition").data;
                
                for ( let i = 0; i < vertices.length - 5; i += 4 ){
                    shaper.beginFill(0, 1);
                    shaper.moveTo(vertices[i + 0], vertices[i + 1]);
                    shaper.lineTo(vertices[i + 2], vertices[i + 3]);
                    shaper.lineTo(vertices[i + 4], vertices[i + 5]);
                    shaper.lineTo(vertices[i + 0], vertices[i + 1]);
                    shaper.endFill();
                }
   

            });
        });
        // shaper.filters = [new PIXI.filters.BlurFilter(blurSize)]
        const texture = renderer.generateTexture(shaper, PIXI.SCALE_MODES.NEAREST, 1, bounds);
        this.focus = new PIXI.Sprite(texture);
        //this.focus.x = -tileSize/2;
        //this.focus.y = -tileSize/2;
        this.focus.x += bounds.x;
        this.focus.y += bounds.y;
        this.mesh.clear();
        this.mesh.beginFill(0x000000, 0.35);
        this.mesh.drawRect(bounds.x, bounds.y, 
                            bounds.width , bounds.height);
        this.mesh.endFill();

        this.mesh.mask = this.focus;
    }
}