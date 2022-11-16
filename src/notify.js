
const JNotify = 
{
    setMessage: (identifier, attribute, message, timeLimit)=>{

        mydoc.setContent(identifier, {attribute: message});

        if(timeLimit != undefined)
        {
            setTimeout( ()=>{
                mydoc.setContent(identifier, {attribute: message});
            }, timeLimit);
        }
    }
}