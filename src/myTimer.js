class MyTimer{
    constructor(){
        this.isRunning = false;
        this.startTime = null;
        this.endTime = null;
        this.elapsedTime = null;
        // save the init time of the timer cuz why not
        let clock = new Date();
        this.initTime = clock.getTime();
    }

    start(){
        if ( ! this.isRunning){
            this.isRunning = true;
            let clock = new Date();
            this.startTime = clock.getTime();
        }
    }

    stop(){
        if ( this.isRunning )         
            this.isRunning = false;
    }

    // check elapsed time without stopping the timer
    getElapsedTime(){
        if (this.isRunning){
            let clock = new Date();
            return (clock.getTime() - this.startTime);
        }
            

        return 0;
    }


}


export {MyTimer}