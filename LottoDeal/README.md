________________________________________________________________________________

LOTTODEAL BACKEND

	by Lucas Irvine, Antony Toron, Dominic Whyte, Prateek Swain, and Steven Takeshita
________________________________________________________________________________

What does the Backend do?
————————————————————————————————————————————
The backend for LottoDeal stores all images, users, and items stored on LottoDeal and parses any requests that the front end sends, returning back the appropriate data.

What is in the LottoDeal Backend folder?
————————————————————————————————————————————
server.js— Server.js contains all of the server (NodeJS and express) and database (mongoDB). The server code lies in the top half and the database code lives in the bottom. Everything is written in JavaScript.

To Install Requisite Libraries
————————————————————————————————————————————
All of the libraries should be already installed if the right git is cloned. However, if not, download node and mongo. To do so, download homebrew, node, mongoDB, and mongoose:
$ /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"
$ brew install node
$ brew install mongodb
$ npm install mongoose

Contact
————————————————————————————————————————————
If any bugs are found or concerns about LottoDeal, contact:
dwhyte@princeton.edu
atoron@princeton.edu
prateeks@princeton.edu
lirvine@princeton.edu
st14@princeton.edu