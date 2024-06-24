import emailjs, { EmailJSResponseStatus } from "@emailjs/browser";
import View from "../View.js";

class ContactMeView extends View {
  _submitBtn = document.getElementById("submit");

  addContactMeHandler(handler) {
    window.addEventListener("load", handler);
  }

  async sendEmail() {
    const params = {
      name: document.getElementById("name").value,
      lastname: document.getElementById("lastname").value,
      email: document.getElementById("email").value,
      message: document.getElementById("message").value,
    };

    try {
      await emailjs.send("service_t4qcx4j", "template_kwezl8a", params, {
        publicKey: "dyz9UzngEOQUHFgv3",
      });
      (document.getElementById("name").value = ""),
        (document.getElementById("lastname").value = ""),
        (document.getElementById("email").value = ""),
        (document.getElementById("message").value = ""),
        alert("Message Sent Successfully!");
    } catch (err) {
      if (err instanceof EmailJSResponseStatus) {
        console.log("EMAILJS FAILED...", err);
        return;
      }

      console.log("ERROR", err);
    }
  }

  sendHandler() {
    this._submitBtn.addEventListener("click", this.sendEmail);
  }
}

export default new ContactMeView();
