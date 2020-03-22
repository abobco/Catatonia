import frag from '../shaders/TextureBuffer/textureBuffer.frag'
import tintFrag from '../shaders/TextureBuffer/tint.frag'

/**
 * Setup for filterCache
 */
class FilterEntry {
    constructor() {
      this.filterManager = null;
      this.filter = null;
      this.key = '1';
      this.texture = null;
      this.tick = 0;
    }
  
    set(filterManager, filter, key, texture, tick) {
      this.filterManager = filterManager;
      this.filter = filter;
      this.key = key;
      this.texture = texture;
      this.tick = tick;
      return this;
    }
  
    alloc() {
      this.texture.cached = true;
      this.texture.filterFrame = this.texture.filterFrame.clone();
      return this;
    }
  
    free() {
      if (!this.texture) {
        return;
      }
      this.texture.cached = false;
      // const oldFrame = this.texture.filterFrame;
      // this.texture.filterFrame = this.texture.filterFrame.clone();
      this.filterManager.returnFilterTexture(this.texture);
      this.texture = null;
    }
  }
  
  function hackReturnTexture(renderTexture) {
    if (renderTexture.cached) {
      return;
    }
    const key = renderTexture.filterPoolKey;
  
    renderTexture.filterFrame = null;
    this.texturePool.returnFilterTexture(renderTexture);
  }
  
  export class FilterCache {
    constructor() {
      this.entries = [];
      this.tick = 0;
    }
  
    update() {
      let entries = this.entries;
      let j = 0;
      for (let i = 0; i < entries.length; i++) {
        let entry = entries[i];
        if (entry.tick < this.tick) {
          entry.free();
        } else {
          entries[j++] = entries[i];
        }
      }
      entries.length = j;
  
      this.tick++;
    }

    clear() {
      let entries = entries;
      for ( let entry of entries){
        entry.free();
      }
      this.entries = [];
    }
  
    getTexture(fm, filter, resolution = 1, key = '1') {
      let entries = this.entries;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.filter === filter && entry.key === key) {
          return entry.texture;
        }
      }
      if (!resolution) {
        return null;
      }
      let entry = new FilterEntry();
      let tex = fm.getFilterTexture(resolution);
  
      fm.renderer.renderTexture.bind(tex, tex.filterFrame);
      fm.renderer.renderTexture.clear();
  
      entry.set(fm, filter, key, tex, this.tick);
      entry.alloc();
      entries.push(entry);
      return tex;
    }
  
    putTexture(fm, filter, texture, key = '1') {
      // @popelyshev: Hacking PixiJS here
      fm.returnFilterTexture = hackReturnTexture;
  
      let entries = this.entries;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        if (entry.filter === filter && entry.key === key) {
          if (entry.texture !== texture) {
            entry.free();
            entry.texture = texture;
            entry.alloc();
          }
          entry.tick = this.tick;
          return;
        }
      }
  
      let entry = new FilterEntry();
      entry.set(fm, filter, key, texture, this.tick);
      entry.alloc();
      entries.push(entry);
    }
  }
  
  /**
   * setup for a filter
   */
  
  export class TextureBufferFilter extends PIXI.Filter {
    constructor(fragment, alpha) {
      if ( !fragment )
        fragment = frag;
      super(undefined, fragment);
      if ( !alpha)
        alpha = 0.9
      this.alphaScale = alpha;
      this.uniforms.alpha =  this.alphaScale;
  
      this._filter = new PIXI.Filter();
    }
  
    reset() {
      this.uniforms.alpha = this.alphaScale;
    }
  
    apply(filterManager, input, output, clear) {
      this.uniforms.prevSampler = this.cache.getTexture(filterManager, this);
      if (output && clear) {
        // shortcut, we save output itself, we are the middle filter
        filterManager.applyFilter(this, input, output, clear);
        this.cache.putTexture(filterManager, this, output);
      } else {
        // we render into main buffer! need to save temp stuff
        let temp = filterManager.getFilterTexture();
        filterManager.applyFilter(this, input, temp, true);
        this._filter.apply(filterManager, temp, output, clear);
        this.cache.putTexture(filterManager, this, temp);
      }
    }
  }

  export class TintedTrail extends TextureBufferFilter{
    constructor(){
      super(tintFrag, 0.01)
    }
  }