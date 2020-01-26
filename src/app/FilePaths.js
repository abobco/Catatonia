class FilePaths {
    constructor() {
        this.filePaths = [
            // sprites
            "sprites/catWalk1.json",
            "sprites/catStop.json",
            "sprites/catIdle.json",
            "sprites/catJump.json",
            "sprites/wallSlide.json",
            "sprites/catHang.json",
            "sprites/catClimbFull.json",
            "sprites/catFall.json",
            "sprites/cathouse_r1.png",
            "sprites/tileSet2.json",
            "sprites/torchSprites.json",
            "sprites/keys.json",
            "sprites/menuButtons.json",
            "sprites/color_map_1.png",
            "sprites/color_map_2.png",
            "sprites/color_map_3.png",

            // shaders
            "shaders/lightFilterVert.GLSL",
            "shaders/lightFilterFrag.GLSL",
            "shaders/lightVert.GLSL",
            "shaders/lightFrag.GLSL",
            "shaders/catnip-effect/catnipVert.GLSL",
            "shaders/catnip-effect/catnipFrag.GLSL",
            "shaders/dissolve/dissolveVert.GLSL",
            "shaders/dissolve/dissolveFrag.GLSL",
            "shaders/BezierDisplacementFilter/BezierDispVert.GLSL",
            "shaders/BezierDisplacementFilter/BezierDispFrag.GLSL",
            "shaders/PaletteSwap/paletteSwap.GLSL"
        ];
    }
    array() {
        return this.filePaths;
    }
}

export {FilePaths}