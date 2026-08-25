document.addEventListener("DOMContentLoaded", function () {
    const togglePasswordButtons = document.querySelectorAll("[id^=togglePassword]");

    togglePasswordButtons.forEach(toggleButton => {
        toggleButton.addEventListener("click", function () {
            const passwordInput = this.previousElementSibling; // Selects the corresponding password field
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            this.innerHTML = type === "password" ? '<img style="width: 22px; height: 22px;" src="../static/img/eye_open.svg" alt="Not shown">' :
                '<img style="width: 22px; height: 22px;" src="../static/img/eye_close.svg" alt="Not shown">';
        });
    });
});


function showLogin() {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("registerForm").classList.add("hidden");
    document.getElementById("loginBtn").classList.add("active");
    document.getElementById("registerBtn").classList.remove("active");
}

function showRegister() {
    document.getElementById("registerForm").classList.remove("hidden");
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("registerBtn").classList.add("active");
    document.getElementById("loginBtn").classList.remove("active");
}

document.getElementById("loginForm").addEventListener("submit", function (event) {
    event.preventDefault();

    let email = document.getElementById("login_email").value.trim();
    let password = document.getElementById("login_password").value;

    fetch('/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert("Login Successful!");
                localStorage.setItem('email', email);
                window.location.href = data.redirect_url;
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred. Check console for details.");
        });


});


document.getElementById("registerForm").addEventListener("submit", function (event) {
    event.preventDefault();
    let isValid = true;
    let full_name = document.getElementById("company_name").value;
    let email = document.getElementById("register_email").value;
    let password = document.getElementById("register_password").value;
    let emailError = document.getElementById("register_emailError");
    let passwordError = document.getElementById("register_passwordError");

    emailError.innerText = "";
    passwordError.innerText = "";

    // Email validation
    let emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        emailError.innerText = "Please enter your email ID";
        isValid = false;
    } else if (!emailPattern.test(email)) {
        if (!email.includes('@') && !email.includes('.')) {
            emailError.innerText = "Please include an '@' and '.' in email address";
        }
        else if (!email.includes('@')) {
            emailError.innerText = "Please include an '@' in email address";
        }
        else if (!email.includes('.')) {
            emailError.innerText = "Please include an '.' in email address";
        }
        isValid = false;
    } else {
        emailError.innerText = "";
    }

    // Password validation
    let passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordPattern.test(password)) {
        let errorMessage = "Password must be at least 8 characters and include: ";
        let conditions = [];
        isValid = false;

        if (!/[a-z]/.test(password)) {
            conditions.push("1 lowercase letter");
        }
        if (!/[A-Z]/.test(password)) {
            conditions.push("1 uppercase letter");
        }
        if (!/\d/.test(password)) {
            conditions.push("1 number");
        }
        if (!/[@$!%*?&]/.test(password)) {
            conditions.push("1 special character");
        }

        errorMessage += conditions.join(",");
        passwordError.innerText = errorMessage;
        return;
    }

    if (isValid) {


        fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: full_name,
                email: email,
                password: password
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert("Register Successful!");
                    window.location.href = "/";
                } else {
                    alert("Error: " + data.message);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("An error occurred. Check console for details.");
            });



        // event.target.submit(); 
        // this.submit();
    }
});