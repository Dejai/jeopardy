# Jeopardy
* This is a home-made version of the classic game;
	* This simple app provides the following key features:
	* Hosting games (i.e. presenting the questions/answers)
	* Creating/editing games as the host
	* Providing answers &amp; wages as the player.

## Accessing the Site
* You can open the site at [https://dejai.github.io/jeopardy](https://dejai.github.io/jeopardy)

## Running Locally
You can run this site locally using the following steps:

* Open commandline terminal 
* Navigate to folder containing this code
* Run one of the following commands: 
	* **Using Python:** `python -m SimpleHTTPServer`
	 OR
	* **Using Docker:** `docker-compose up -d --build`
* Open site in browser at `localhost:4000` 
	* Note: You can change the port in the *docker-compose.yml* file.