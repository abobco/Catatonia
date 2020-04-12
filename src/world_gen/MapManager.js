import { DebugMap } from "./debugMap";
import { CellularMap } from "./CellularMap";
import { WangMap } from "./WangMap";

export function MapManager(resources, type = "debug"){
    switch(type) {
        case "debug":
            return new DebugMap(resources, {});
            break;
        case "wang":
            return new WangMap( resources, {
                    w: 30,
                    h: 30, 
                    numLights: 4,    
                    numSpectres: 6,
                });
            break;
        case "cave":
            new CellularMap(resources, {
                    w: 30,
                    h:30,         
                    numLights: 5,  
                    numSpectres: 5,
                });
            break;
    }
}
