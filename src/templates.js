/***** 
TEMPLATES  OBJECT 
This object coordinates getting the different templates

PREREQUISITE: 
    > It depends on common functionality in the shared commons.js file
******/


const MyTemplates = {

    // Generate and return HTML 
    getTemplate:(filePath, object, callback) =>   {

        myajax.GET(filePath, (data)=>{

            // The template from the file
            var template = data.responseText;
            // The content after template is updated
            var content = "";
            
            // Ensure the object is a list (even if just one);
            var objectList = (object != undefined && object.length == undefined) ? [object] : object;
            objectList = (objectList == undefined)? [{}] : objectList;
            var objectLength = (objectList.length > 0) ? Object.keys(objectList[0]).length : 0;

            // Get the placeholders in this template
            var placeholders = MyTemplates.getTemplatePlaceholders(template);

            // console.log(objectList);
            if(objectLength > 0)
            {
                // console.log("Placeholders:");
                // console.log(placeholders);
                objectList.forEach( (obj)=>{
                    objContent = template;
                    placeholders.forEach( (placeholder)=>{
                        let keyVal = placeholder.replaceAll("{","").replaceAll("}","");
                        let newVal = MyTemplates.getObjectValue(keyVal,obj) ?? "";
                        objContent = objContent.replaceAll(placeholder, newVal);
                    });
                    content += objContent
                });
            }
            else
            {
                // Return empty content if the placeholders can't be replaced;
                content = (placeholders.length == 0) ? template : "";
            }
            // Run the callback function on the content
            callback(content);
        });
    },

    getTemplatePlaceholders:(template)=>{
        let placeholders = [];

        let splits = template.split("{{");
        splits.forEach( (item)=>{
            if(item.includes("}}"))
            {
                let value = item.split("}}")[0];
                let temp = `{{${value}}}`;
                if(!placeholders.includes(temp))
                {
                    placeholders.push(temp);
                }

            }
        });
        return placeholders;
    },

    getObjectValue: (selector,object)=>{
        var keys = selector.split(".");
        value = object;
        limit = 100; count = 0;
        while (keys.length > 0 && count < limit)
        {
            count++; //counter to prevent infinite loop;
            currKey = keys.shift();
            if(value.hasOwnProperty(currKey))
            {
                value = value[currKey];
            }
        }
        return value;
    }


}
