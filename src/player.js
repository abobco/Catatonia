var Player = function(rectangle, animationMap ) {

    // physics variables
    this.centerPos = new PIXI.Point(rectangle.x, rectangle.y);
    this.scale = 3;
    this.maxVel = 3;
    this.jumpVel = -12;
    this.xVel = 0;
    // collider varibales
    this.colliderWidth = rectangle.width;
    this.colliderHeight = rectangle.height; 
    // action flags
    this.isGrounded = false,
    this.inSlide = false,
    this.inSlowDown = false;
    this.jumpInput = false;

    this.flip = "left";
    // Key-value pairs of strings and animations
    this.animations = animationMap;

    // Move all sprites
    this.setPosition = function(ix,iy) {
        this.centerPos.x = ix;
        this.centerPos.y = iy;

        this.animations.forEach(function (value) {
            value.x = ix;
            value.y = iy;
        })
    }

    // change active animation, play at given frame
    this.setAnimation = function(key, frame = 0) {
        // clear all previous animations
        this.animations.forEach(function (value) {
            value.visible = false;
        })
        var activeAnim = this.animations.get(key);
        activeAnim.visible = true;
        activeAnim.gotoAndPlay(frame);
        this.animations.set(key, activeAnim);
    } 
    
    // flip the cat around 
    this.setFlip = function(dir) {
        var localScale;
        if ( dir == "right" ) {
            localScale = -3;
            this.scale = -3;
            this.flip = "right";
        }
        else if ( dir == "left") {
            localScale = 3;
            this.scale = 3;
            this.flip = "left";
        }
        this.animations.forEach(function (value) {
            value.scale.x = localScale;
        })        
    }
};

Player.prototype.constructor = Player;
export { Player };