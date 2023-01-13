


// Set the question popup; Also used to reset after closing 
function onSetQuestionPopup()
{
    // Setting the parts of the question
    MyTemplates.getTemplate("board/templates/questionPopup.html", {},(template)=>{
        mydoc.setContent("#show_question_section",{"innerHTML":template});
    });
}

// Open a preview of a question
// Opening a question 
function onPreviewQuestion(event)
{
    
    let target = event.target; 
    let section = target.closest(".categorySection");
    let questionRow = target.closest(".questionRow");
    
    let categoryName = section.querySelector(".categoryName")?.innerText ?? "";
    let questionValue = questionRow.querySelector(".questionValue")?.innerText ?? "";
    var key = `${categoryName}-${questionValue}`;

    // Get the category
    let category = JeopardyGame.getCategory(categoryName);

    // Get the question
    let questionObj = category?.getQuestion(questionValue);

    // Get the question value
    questionValue *= (questionObj.DailyDouble == "Yes") ? 2 : 1;

    // Get the question part of the question (including possible daily double content)
    let questionHTML = questionObj.Question.getQuestionHTML(JeopardyGame);
    let dailyDoubleHTML = (questionObj.DailyDouble == "Yes") ? getDailyDoubleContent() : ""

    // Get the answer part of the question
    let answerHTML = questionObj.Answer.getAnswerHTML(JeopardyGame);

    // Set the HTML content for the parts of the question
    mydoc.setContent("#value_block", {"innerHTML":questionValue});
    mydoc.setContent("#question_block", {"innerHTML": (dailyDoubleHTML + questionHTML)});
    mydoc.setContent("#answer_block", {"innerHTML":answerHTML});

    // Add the teams
    // onLoadWhoGotItRightSection();

    // Show the question;
    mydoc.showContent("#question_view");
}


// Reveal the answer in the question popup; Also reveal player answers
function onRevealAnswer(event)
{
    // Show the sections
    mydoc.showContent("#answer_block");
    mydoc.hideContent("#reveal_answer_block");
    mydoc.hideContent("#question_block audio");

    // The transition to question to be hidden
    mydoc.addClass("#question_block", "hiddenBlock");
    mydoc.removeClass("#question_block", "visibleBlock");

    // The transition for the answer to be visible
    mydoc.addClass("#answer_block", "visibleBlock");
    mydoc.removeClass("#answer_block", "hiddenBlock");
}

function onCloseQuestion()
{
    mydoc.hideContent("#question_view");
    onSetQuestionPopup(); // Reset the question popup by reloading template;
}


// Get the image and audio used for Daily Double
function getDailyDoubleContent()
{
    // Add the default jeopardy media
    let dailyDoubleAudio = { 
        "ID": "_dailyDoubleAudio", 
        "Name": "_dailyDoubleAudio", 
        "Type": "Audio",
        "Src": "src/audio/daily_double.m4a"
    }
    let dailyDoubleImage = { 
        "ID": "_dailyDoubleImage", 
        "Name": "_dailyDoubleImage", 
        "Type": "Image",
        "Src": "src/img/daily_double.jpeg"
    }
    // Add the daily double audio - if not already there; 
    let dda = JeopardyGame.getMedia("_dailyDoubleAudio");
    if (dda == undefined){  JeopardyGame.addMedia(dailyDoubleAudio); }
   
    // Add the daily double image - if not already there; 
    let ddi = JeopardyGame.getMedia("_dailyDoubleImage");
    if (ddi == undefined){  JeopardyGame.addMedia(dailyDoubleImage); }

    // Retrieve the audio & image;
    let ddAudio = JeopardyGame.getMediaHTML("_dailyDoubleAudio",true);
    let ddImage = JeopardyGame.getMediaHTML("_dailyDoubleImage");
    return ddAudio + ddImage + "<br/>";
}

