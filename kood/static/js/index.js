const addLoginFunctionality = () => {
  const userToken = sessionStorage.getItem("JWT");
  if (userToken) {
    window.location.href = "graphql.html";
  } else {
    const loginForm = document.getElementById("loginForm");
    const usernameOrEmail = document.getElementById("usernameOrEmail");
    const password = document.getElementById("password");
    const inputs = document.querySelectorAll(".inputbox");
    const loginBtn = document.getElementById("loginBtn");
    inputs.forEach((input) => {
      input.addEventListener("input", () => {
        if (input.value)
          document.getElementById(`${input.id}-error`).innerHTML = "";
        if (
          (input.id === "password" && usernameOrEmail.value) ||
          (input.id === "usernameOrEmail" && password.value)
        ) {
          loginBtn.disabled = false;
        } else {
          loginBtn.disabled = true;
        }
      });
    });

    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();

      inputs.forEach((input) => {
        if (!input.value) {
          document.getElementById(
            `${input.id}-error`
          ).innerHTML = `This field is required`;
        }
      });
      if (usernameOrEmail.value && password.value) {
        attemptLogin(usernameOrEmail.value, password.value);
      }
    });
  }
};

const attemptLogin = async (usernameOrEmail, password) => {
  const url = "https://01.kood.tech/api/auth/signin"; 

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Content-Encoding": "base64",
      Authorization: "Basic " + btoa(`${usernameOrEmail}:${password}`),
    },
  };

  try {
    const response = await fetch(url, options);
    handleLoginResponse(response);
  } catch (error) {
    console.error(error);
  }
};

const handleLoginResponse = async (response) => {
  if (response.ok) {
    const result = await response.json();
    sessionStorage.setItem("JWT", result);
    window.location.href = "/kood/";
  } else {
    document.getElementById("password-error").innerHTML =
      "Login credentials invalid, please try again";
  }
};

window.onload = addLoginFunctionality();
