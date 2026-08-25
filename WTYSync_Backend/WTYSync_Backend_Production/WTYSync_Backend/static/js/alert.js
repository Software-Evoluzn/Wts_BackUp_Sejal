document.addEventListener("DOMContentLoaded", function () {
    // Select all close buttons
    const closeButtons = document.querySelectorAll('.temp_alert_box_close');

    closeButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Traverse up to the alert box container and remove it
            const alertBox = this.closest('.temp_r_y_b_alert_box_div');
            if (alertBox) {
                alertBox.remove();
            }
        });
    });
});

// alert close end

// alertclose logic--------start

function deleteAlert(elem) {
    const outerBox = elem.closest('.temp_r_y_b_alert_box_div');
    const alertBox = outerBox.querySelector('.alert-box');
    const alertMessage = alertBox.getAttribute('data-alert-message');

    fetch('/delete_alert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: alertMessage })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            outerBox.remove(); // ✅ Remove full container
        } else {
            alert("Error deleting alert.");
        }
    })
    .catch(err => {
        console.error("Delete error:", err);
    });

    console.log("Deleting alert with message:", alertMessage);
}