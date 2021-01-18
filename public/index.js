window.onload = function() {
  document.getElementById('id-anonymous').addEventListener('click', () => {
    document.getElementById('id-password').disabled = true;
    document.getElementById('id-email').disabled = true;
  });
  document.getElementById('id-login').addEventListener('click', () => {
    document.getElementById('id-password').disabled = false;
    document.getElementById('id-email').disabled = true;
  });
  document.getElementById('id-register').addEventListener('click', () => {
    document.getElementById('id-password').disabled = false;
    document.getElementById('id-email').disabled = false;
  });
  document.getElementById('id-form').addEventListener('submit', (event) => {
    event.preventDefault();
    // remove old warning
    for(let elem of document.getElementsByClassName('id-error')) {
      elem.remove();
    }
    // grab form data
    let form = document.getElementById('id-form');
    let formData = new FormData(form);
    let data = {};
    for(let pair of formData.entries()) {
      data[pair[0]] = pair[1];
    }
    console.log(data.password);
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
        console.log(data);
        let divs = form.getElementsByTagName('div');
        let elem = document.createElement("p");
        elem.setAttribute('class', 'id-error');
        elem.innerText = data.error;
        switch(data.code) {
          case 'username':
            divs[0].appendChild(elem);
            break;
          case 'password':
            divs[1].appendChild(elem);
            break;
          case 'email':
            divs[2].appendChild(elem);
            break;
          case 'mode':
            divs[3].appendChild(elem);
            break;
          default:
            if(data.message) {
              elem.innerText = data.message;
            }
            divs[4].appendChild(elem);
            break;
        }
        return;
      })
      .catch(err => {
        console.log(err);
      });
    return;
  }, true);
};
