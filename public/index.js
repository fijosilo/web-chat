
window.addEventListener('DOMContentLoaded', (event) => {
  document.getElementById('mode-anonymous').addEventListener('click', () => {
    document.getElementById('password').getElementsByTagName('input')[0].disabled = true;
    document.getElementById('email').getElementsByTagName('input')[0].disabled = true;
  });
  document.getElementById('mode-login').addEventListener('click', () => {
    document.getElementById('password').getElementsByTagName('input')[0].disabled = false;
    document.getElementById('email').getElementsByTagName('input')[0].disabled = true;
  });
  document.getElementById('mode-register').addEventListener('click', () => {
    document.getElementById('password').getElementsByTagName('input')[0].disabled = false;
    document.getElementById('email').getElementsByTagName('input')[0].disabled = false;
  });
  document.getElementsByTagName('form')[0].addEventListener('submit', (event) => {
    event.preventDefault();
    // remove old warning
    let elemWarning = document.getElementById('error');
    if(elemWarning) {
      elemWarning.remove();
    }
    // grab form data
    let form = document.getElementsByTagName('form')[0];
    let formData = new FormData(form);
    let data = {};
    for(let pair of formData.entries()) {
      data[pair[0]] = pair[1];
    }
    if(data.mode === 'Anonymous') {
      data.password = '********';
    }
    // send request to server
    fetch('/auth', {
        method: 'POST',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(data)
      })
      .then(res => {
        // if we got redirected
        if(res.redirected) {
          // redirect
          window.location.href = res.url;
          return {redirected: true};
        } else {
          // get response as json
          return res.json();
        }
      })
      .then(data => {
        // if we got redirected skip this
        if(data.redirected) {
          return;
        }
        // create new warning
        let divs = form.getElementsByTagName('div');
        let elem = document.createElement("p");
        elem.setAttribute('id', 'error');
        elem.innerText = data.error;
        switch(data.code) {
          case 'username':
            document.getElementById('username').appendChild(elem);
            break;
          case 'password':
            document.getElementById('password').appendChild(elem);
            break;
          case 'email':
            document.getElementById('email').appendChild(elem);
            break;
          case 'mode':
            document.getElementById('mode').appendChild(elem);
            break;
          default:
            if(data.message) {
              elem.innerText = data.message;
            }
            document.getElementById('submit').appendChild(elem);
            break;
        }
        return;
      })
      .catch(err => {
        console.log(err);
      });
    return;
  }, true);
});
