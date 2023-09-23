class Test{

    constructor(){
    }

    #Internal(url){
        return MyFetch.call("GET", url, {"responseType":"text"});
    }

    External(){
        return this.#Internal("src/templates/gameBlock.html");
    }
}

var testy = new Test();

async function TestRun(){
    var testResults = await testy.External();
    console.log(testResults);
}

TestRun();