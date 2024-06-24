import View from "../View.js";
require("dotenv").config();

class LoginView extends View {
  _signupHere = document.querySelector(".signup-here");
  _loginHere = document.querySelector(".login-here");
  addLoginViewHandler(handler) {
    window.addEventListener("load", handler);
  }

  generateSignup() {
    const loginBtn = document.querySelector(".loginsignup-login");
    const signupBtn = document.querySelector(".loginsignup-signup");
    // const modeSwitch = document.querySelector(".switch-mode");
    loginBtn.classList.toggle("hide");
    signupBtn.classList.toggle("hide");

    const loginTitle = document.querySelector(".login-title");
    loginTitle.textContent = "Signup";

    const markup = `
    <input name="username" type="text" placeholder="Your Name" id="username-input"/>
    `;

    const logFields = document.querySelector(".loginsignup-fields");
    logFields.insertAdjacentHTML("afterbegin", markup);
  }

  generateLogin() {
    const loginBtn = document.querySelector(".loginsignup-login");
    const signupBtn = document.querySelector(".loginsignup-signup");
    loginBtn.classList.toggle("hide");
    signupBtn.classList.toggle("hide");
    const logFields = document.querySelector(".loginsignup-fields");
    logFields.innerHTML = "";
    const loginTitle = document.querySelector(".login-title");
    loginTitle.textContent = "Login";
    const markup = `<input name="email" type="email" placeholder="Email Address" />
    <input name="password" type="password" placeholder="Password" />`;
    logFields.insertAdjacentHTML("afterbegin", markup);
  }

  changeMode = function () {
    const modeCheck =
      document.querySelector(".login-title").textContent == "Login";

    const signupFn = this._signupHere.addEventListener(
      "click",
      this.generateSignup
    );

    const loginFn = this._loginHere.addEventListener(
      "click",
      this.generateLogin
    );

    modeCheck ? signupFn : loginFn;
  };

  generateAdminBtn = function () {
    const markup = `<li class="main-nav-tab login" id="login-tab" href="#">
            <a class="attrib login-btn" href=${process.env.ADMIN_URL}>Dashboard/a>
          </li>`;
  };

  loginHandler = function (event, data) {
    try {
      const formData = {
        email: data.email,
        password: data.password,
      };

      const login = async function (e, userFormData) {
        try {
          e.preventDefault();

          const serverUrl = `${process.env.API_URL}`;

          const response = await fetch(`${serverUrl}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userFormData),
            credentials: "include",
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          if (data.success) {
            localStorage.setItem("auth-token", data.token);
            // console.log(`${process.env.HOST}`);
            window.location.assign(`/html/bambaYafa.html`)
          //   const resp = await fetch(`${process.env.API_URL}/admin`, {
          //     method: 'GET',
          //     headers: {
          //       "Content-Type": "application/json",
          //     }
          //   }
          // )
          // const respData = await resp.text()
          // console.log(respData);
          }
            // const userAdminCheck = data.adminCheck == "admin" 
            // if (userAdminCheck) {}
        } catch (error) {
          console.error(
            "⛔An error occurred during login. Please try again:",
            error
          );
        }
      };

      // if (data.adminCheck == "user") {
      //   window.location.replace("../../index.html");
      // }
      // const logContainer = document.querySelector(".loginsignup-container");
      // logContainer.removeChild(logFields);
      // logContainer.insertAdjacentHTML("afterbegin", markup);
      //     const logFields = document.querySelector('.loginsignup-fields')
      //     const markup = `<div class="main-nav-tab login" id="login-tab" href="#">Hello Admin!
      //   <a class="attrib login-btn" href=${process.env.ADMIN_URL}>Go to Dashboard</a>
      // </div>`;

      const signup = async function (formData) {
        try {
          const serverUrl = `${process.env.API_URL}`;
          const response = await fetch(`${serverUrl}/signup`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
            // credentials: "include",
          });

          const data = await response.json();

          if (data.success) {
            localStorage.setItem("auth-token", data.token);
            alert(data.message);
            window.location.replace("../index.html");
          } else {
            console.error(data.errors);
          }
        } catch (err) {
          console.error();
          alert(
            "An error occurred during signup. Please try again.",
            "Signup Error:",
            err
          );
        }
      };

      const modeCheck =
        document.querySelector(".login-title").textContent == "Login";
      modeCheck ? login(event, formData) : signup(data);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  continueLogin() {
    const continueBtn = document.querySelector(".continue-button");
    continueBtn.addEventListener("click", (event) => {
      const userEmail = document.getElementById("email-input").value;
      const userPassword = document.getElementById("password-input").value;

      if (userEmail === "" || userPassword === "") {
        alert("Please enter a valid email or password");
        return;
      }

      const data = {
        email: userEmail,
        password: userPassword,
      };
      if (userEmail == "" || userPassword == "") {
        alert("Please enter a valid email or password");
      }
      this.loginHandler(event, data);
    });
  }

  continueSignup() {
    const continueBtn = document.querySelector(".continue-button");
    continueBtn.addEventListener("click", (e) => {
      const userUsername = document.getElementById("username-input").value;
      const userEmail = document.getElementById("email-input").value;
      const userPassword = document.getElementById("password-input").value;

      if (userUsername === "" || userEmail === "" || userPassword === "") {
        alert("Please fill out all fields");
        return;
      }

      const data = {
        username: userUsername,
        email: userEmail,
        password: userPassword,
      };

      this.loginHandler(data);
    });
  }

  continueHandler = function () {
    const modeCheck =
      document.querySelector(".login-title").textContent == "Login";

    modeCheck ? this.continueLogin() : this.continueSignup();
  };

  // initialize() {
  //   document.addEventListener("DOMContentLoaded", () => {
  //     this._signupHere = document.querySelector(".signup-here");
  //     this._loginHere = document.querySelector(".login-here");
  //     this._signupHere.addEventListener(
  //       "click",
  //       this.generateSignup.bind(this)
  //     );
  //     this._loginHere.addEventListener("click", this.generateLogin.bind(this));
  //     this.continueHandler();
  //   });
  // }
}

export default new LoginView();
