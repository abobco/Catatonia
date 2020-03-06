/** returns an array of paths to spritesheets and shaders */
export function FilePaths() {
    return [
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
        "sprites/big_wang.png",
        "sprites/dungeon.json",
        "sprites/perlin-noise.png",
        "sprites/perlin-2.png",

        // shaders
        "shaders/lightFilterVert.GLSL",
        "shaders/lightFilterFrag.GLSL",
        "shaders/light.vert",
        "shaders/light.frag",
        "shaders/dissolve/dissolve.vert",
        "shaders/dissolve/dissolve.frag",
        "shaders/BezierDisplacementFilter/BezierDisp.vert",
        "shaders/BezierDisplacementFilter/BezierDisp.frag",
        "shaders/PaletteSwap/paletteSwap.frag",
        "shaders/Shadows/shadowFilter.vert",
        "shaders/Shadows/shadowFilter.frag"
    ];
}