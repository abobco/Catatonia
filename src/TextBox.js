class TextBox{
    constructor(x, y, width, _fontSize, text){
        this.boxRenderer = new PIXI.Graphics();

        const style = new PIXI.TextStyle({
            fontFamily: "\"Lucida Console\", Monaco, monospace",
            fontSize: _fontSize,
            wordWrap: true,
            wordWrapWidth: width,
            fill: '#ffffff'
        });
        
        this.renderedText = new PIXI.Text(text, style);
        this.renderedText.position.set(x,y);
    }
}

export {TextBox};