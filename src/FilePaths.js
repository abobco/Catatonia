class FilePaths {
    constructor() {
        this.filePaths = [
            // sprites
            "sprites/catWalk1.json",
            "sprites/catStop.json",
            "sprites/catJump.json",
            "sprites/wallSlide.json",
            "sprites/catHang.json",
            "sprites/catClimbFull.json",
            "sprites/cathouse_r1.png",
            // "sprites/caveTiles.json",
            "sprites/tileSet2.json",

            // shaders
            "shaders/lightFilterVert.GLSL",
            "shaders/lightFilterFrag.GLSL",
            "shaders/lightVert.GLSL",
            "shaders/lightFrag.GLSL"
        ];
    }
    array() {
        return this.filePaths;
    }
}

export {FilePaths}