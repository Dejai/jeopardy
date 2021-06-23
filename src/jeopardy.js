class Jeopardy
{
	constructor()
	{
		// this.name = name
		this.categories = [];
		this.category_map = []
	}

	addCategory(category)
	{
		this.categories.push(category);
	}

	getCategories()
	{
		return this.categories;
	}

	getCategory(name)
	{
		let theCategory = {};
		this.categories.forEach(function(obj){
			if(obj.getName() == name)
			{
				theCategory = obj; 
			}
		});
		return theCategory;
	}

	categoryExists(name)
	{
		let names = [];
		this.categories.forEach(function(obj){
			names.push(obj.getName());
		});
		return names.includes(name);
	}
};

class Category
{
	constructor(name)
	{
		this.name = name;
		this.questions = [];
		this.finalJeopardy = this.setIsFinalJeopardy();
	}

	setIsFinalJeopardy()
	{
		let bool = false;
		let formatted = this.name.toUpperCase().replace(" ", "");
		if(formatted == "FINALJEOPARDY" || formatted == "FINALJEOPARDY!")
		{
			bool = true;
		}
		return bool;
	}

	addQuestion(question)
	{
		this.questions.push(question);
	}

	getName(){ return this.name; }

	isFinalJeopardy() { return this.finalJeopardy; }

	getQuestions()
	{
		return this.questions;
	}
}

class Question
{
	constructor(question, questAudio, questImg, questURL, 
				answer, answerAudio, answerImg, answerURL,
				value, dailyDouble)
	{
		this.question 		= this.format_content(question);
		this.questionAudio 	= questAudio;
		this.questionImage 	= questImg;
		this.questionURL	= questURL

		this.answer   		= this.format_content(answer);
		this.answerAudio 	= answerAudio;
		this.answerImage 	= answerImg;
		this.answerURL 	= answerURL;

		this.value    		= value;

		this.dailyDouble    = (dailyDouble == "Yes" || dailyDouble == true) ?  true : false;
	}

	// Format content
	format_content(value)
	{
		let formatted = value.replaceAll(/((^|\s))\"/g, "$1&#8220;").replaceAll(/\"/g, "&#8221;")
		return formatted
		// formatted = formatted.
	}

	// Setters
	setQuestionAudio(path) { this.questionAudio = path; }
	setQuestionImage(path) { this.questionAudio = path; }
	setQuestionURL(path) { this.questionAudio = path; }
	setAnswerAudio(path) { this.answerAudio = path; }
	setAnswerImage(path) { this.answerAudio = path; }
	setAnswerURL(path) { this.answerAudio = path; }

	// Getters
	getValue(){ return this.value; }

	getQuestion(){
		let question_obj = {
			"value": this.value,
			"text": this.question,
			"audio": this.questionAudio,
			"image": this.questionImage,
			"url": this.questionURL,
			"dailydouble": this.dailyDouble
		} 
		return question_obj;
	}

	getAnswer(){
		let answer_obj = {
			"text": this.answer,
			"audio": this.answerAudio,
			"image": this.answerImage,
			"url": this.answerURL
		} 
		return answer_obj;
	}
}