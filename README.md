# Jeopardy
* This is a home-made version of the classic game;
	* This simple app provides the following key features:
	* Hosting games (i.e. presenting the questions/answers)
	* Creating/editing games as the host
	* Providing answers &amp; wages as the player.

## Accessing the Site
* You can open the site at:
	* [https://jeopardy.pages.dev/](https://jeopardy.pages.dev/)


## Running Locally
You can run this site locally using the following steps:

* Open commandline terminal 
* Navigate to folder containing this code
* Run one of the following commands: 
	* **Using Python:** `python -m SimpleHTTPServer 7000`
	 OR
	* **Using Python:** `python2 -m http.server 7000`
	 OR
	* **Using Docker:** `docker-compose up -d --build`

* Open site in browser at `localhost:<port>`
	* Replace "`<port>`" with whatever port number you put in the command (or in the docker file)