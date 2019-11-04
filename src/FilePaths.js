class FilePaths {
    constructor() {
        this.filePaths = [
            // sprites
            "sprites/catWalk.json",
            "sprites/catStop.json",
            "sprites/catJump.json",
            "sprites/wallSlide.json",
            "sprites/cathouse_r1.png",

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