
class BBCode {

  parse(str) {
    // copy string
    let parsedString = '' + str;
    // parse string
    // bold
    parsedString = parsedString.replace(/\[b\]([\w\W]*?)\[\/b\]/gm, '<span class="bb-bold">$1</span>');
    // italic
    parsedString = parsedString.replace(/\[i\]([\w\W]*?)\[\/i\]/gm, '<span class="bb-italic">$1</span>');
    // underline
    parsedString = parsedString.replace(/\[u\]([\w\W]*?)\[\/u\]/gm, '<span class="bb-underline">$1</span>');
    // strikethrough
    parsedString = parsedString.replace(/\[s\]([\w\W]*?)\[\/s\]/gm, '<span class="bb-strikethrough">$1</span>');
    // font-size
    parsedString = parsedString.replace(/\[size=([-\d.]*)\]([\w\W]*?)\[\/size\]/gm, '<span class="bb-fontsize" data-fontsize="$1rem">$2</span>');
    parsedString = parsedString.replace(/\[style size=([-\d.]*)\]([\w\W]*?)\[\/style\]/gm, '<span class="bb-fontsize" data-fontsize="$1rem">$2</span>');
    parsedString = parsedString.replace(/\[size=([-\d.]*[a-z%]*)\]([\w\W]*?)\[\/size\]/gm, '<span class="bb-fontsize" data-fontsize="$1">$2</span>');
    parsedString = parsedString.replace(/\[style size=([-\d.]*[a-z%]*)\]([\w\W]*?)\[\/style\]/gm, '<span class="bb-fontsize" data-fontsize="$1">$2</span>');
    // font color
    parsedString = parsedString.replace(/\[color=([\w#\(\),]*)\]([\w\W]*?)\[\/color\]/gm, '<span class="bb-color" data-color="$1">$2</span>');
    parsedString = parsedString.replace(/\[style color=([\w#\(\),]*)\]([\w\W]*?)\[\/style\]/gm, '<span class="bb-color" data-color="$1">$2</span>');
    // center text
    parsedString = parsedString.replace(/\[center\]([\w\W]*?)\[\/center\]/gm, '<div class="bb-aligncenter">$1</div>');
    // left align text
    parsedString = parsedString.replace(/\[left\]([\w\W]*?)\[\/left\]/gm, '<div class="bb-alignleft">$1</div>');
    // right align text
    parsedString = parsedString.replace(/\[right\]([\w\W]*?)\[\/right\]/gm, '<div class="bb-alignright">$1</div>');
    // quote
    parsedString = parsedString.replace(/\[quote\]([\w\W]*?)\[\/quote\]/gm, `<div class="bb-quote">
      <div>
        <i>“</i>
        <p>$1</p>
        <i>”</i>
      </div>
    </div>`);
    // quote (named)
    parsedString = parsedString.replace(/\[quote=([\w\W]*?)\]([\w\W]*?)\[\/quote\]/gm, `<div class="bb-quote">
      <div>
        <i>“</i>
        <p>$2</p>
        <i>”</i>
      </div>
      <p>$1</p>
    </div>`);
    // spoiler
    parsedString = parsedString.replace(/\[spoiler\]([\w\W]*?)\[\/spoiler\]/gm, `<div class="bb-spoiler">
      <span>SPOILER ALERT !!!</span>
      <a href="">toggle spoiler</a>
      <div>
        <p>$1</p>
      </div>
    </div>`);
    // spoiler (named)
    parsedString = parsedString.replace(/\[spoiler=([\w\W]*?)\]([\w\W]*?)\[\/spoiler\]/gm, `<div class="bb-spoiler">
      <span>SPOILER ALERT !!!</span>
      <a href="">$1</a>
      <div>
        <p>$2</p>
      </div>
    </div>`);
    // link
    parsedString = parsedString.replace(/\[url\]([\w\W]*?)\[\/url\]/gm, '<a class="bb-link" href="$1" target="_blank">$1</a>');
    // link (named)
    parsedString = parsedString.replace(/\[url=([\w\W]*?)\]([\w\W]*?)\[\/url\]/gm, '<a class="bb-link" href="$1" target="_blank">$2</a>');
    // image
    parsedString = parsedString.replace(/\[img\]([\w\W]*?)\[\/img\]/gm, '<div class="bb-image"><img src="$1" /></div>');
    // image (resized)
    parsedString = parsedString.replace(/\[img=(\d*)x(\d*)\]([\w\W]*?)\[\/img\]/gm, '<div class="bb-image-resized"><img src="$3" width="$1" height="$2" /></div>');
    // image (metadata)
    parsedString = parsedString.replace(/\[img ([\w\W]*?)\]([\w\W]*?)\[\/img\]/gm, '<div class="bb-image-resized"><img src="$2" $1 /></div>');
    // list
    parsedString = parsedString.replace(/\[ol\]([\w\W]*?)\[\/ol\]/gm, '<ol class="bb-list">$1</ol>');
    parsedString = parsedString.replace(/\[ul\]([\w\W]*?)\[\/ul\]/gm, '<ul class="bb-list">$1</ul>');
    parsedString = parsedString.replace(/\[list\]([\w\W]*?)\[\/list\]/gm, '<ul class="bb-list">$1</ul>');
    // list item
    parsedString = parsedString.replace(/\[li\]([\w\W]*?)\[\/li\]/gm, '<li>$1</li>');
    // TODO: function to parse code a aply span with class like variable, keyword, etc
    // code
    parsedString = parsedString.replace(/\[code\]([\w\W]*?)\[\/code\]/gm, '<pre  class="bb-code"><code>$1</code></pre>');
    // code (language specific)
    parsedString = parsedString.replace(/\[code=([\w\W]*?)\]([\w\W]*?)\[\/code\]/gm, '<pre class="bb-code"><code class="bb-code-$1">$2</code></pre>');
    // preformatted
    parsedString = parsedString.replace(/\[pre\]([\w\W]*?)\[\/pre\]/gm, '<pre class="bb-preformatted">$1</pre>');
    // tables
    parsedString = parsedString.replace(/\[table\]([\w\W]*?)\[\/table\]/gm, '<table class="bb-table">$1</table>');
    // table rows
    parsedString = parsedString.replace(/\[tr\]([\w\W]*?)\[\/tr\]/gm, '<tr>$1</tr>');
    // table content cells
    parsedString = parsedString.replace(/\[th\]([\w\W]*?)\[\/th\]/gm, '<th>$1</th>');
    parsedString = parsedString.replace(/\[td\]([\w\W]*?)\[\/td\]/gm, '<td>$1</td>');
    // youtube videos
    parsedString = parsedString.replace(/\[youtube\]([\w\W]*?)\[\/youtube\]/gm, `<div class="bb-youtube">
      <iframe src="https://www.youtube.com/embed/$1?enablejsapi=1&origin=https://darastrix.dynip.sapo.pt" allowfullscreen></iframe>
    </div>`);
    // untagged links
    let arrText = parsedString.match(/\S+/gm);
    if(arrText) {
      for(const strText of arrText) {
        let elmInput = document.createElement('input');
        elmInput.setAttribute('type', 'url');
        elmInput.value = strText;
        if(elmInput.checkValidity()) {
          parsedString = parsedString.replace(arrText, '<a class="bb-link" href="'+arrText+'" data-untagged="true" target="_blank">'+arrText+'</a>');
        }
      }
    }
    // return parsed string
    return parsedString;
  }

  parsedToHTML(str, elm=null) {
    if(!elm) {
      elm = document.createElement('div');
    }
    // TODO: escape html code from str
    elm.innerHTML = str;
    // font-size
    let elmsFontSize = elm.getElementsByClassName('bb-fontsize');
    for(let elmSpan of elmsFontSize) {
      // get target size
      let targetSize = elmSpan.getAttribute('data-fontsize');
      targetSize = targetSize.replace(/[^-\d\.]/g, '');
      targetSize = Number(targetSize);
      // get target units
      let targetUnits = elmSpan.getAttribute('data-fontsize');
      targetUnits = targetUnits.replace(/[^a-z-A-Z%]/g, '');
      // get default size
      let defaultPixelSize = document.getElementsByTagName('html')[0].style.fontSize;
      defaultPixelSize = defaultPixelSize ? defaultPixelSize : '16px';
      defaultPixelSize = defaultPixelSize.replace(/[^-\d\.]/g, '');
      defaultPixelSize = Number(defaultPixelSize);
      // convert target size to pixels
      const targetPixelSize = this.convertCSSUnitsToPixels(targetSize, targetUnits, defaultPixelSize, defaultPixelSize);
      // set min and max ratios
      const minRatioSize = 0.5;
      const maxRatioSize = 4;
      // limit target size
      if(targetPixelSize < (defaultPixelSize * minRatioSize)) {
        elmSpan.style.fontSize = minRatioSize+'rem';
      } else if(targetPixelSize > (defaultPixelSize * maxRatioSize)) {
        elmSpan.style.fontSize = maxRatioSize+'rem';
      } else {
        elmSpan.style.fontSize = elmSpan.getAttribute('data-fontsize');
      }
    }
    // font color
    let elmsFontColor = elm.getElementsByClassName('bb-color');
    for(let elmSpan of elmsFontColor) {
      elmSpan.style.color = elmSpan.getAttribute('data-color');
    }
    // spoiler && spoiler (named)
    let elmsSpoiler = elm.getElementsByClassName('bb-spoiler');
    for(let elmDiv of elmsSpoiler) {
      elmDiv.getElementsByTagName('a')[0].addEventListener('click', (e) => {
        e.preventDefault();
        // toggle spoiler
        let elmSpoiler = e.target.parentElement.getElementsByTagName('div')[0];
        if(elmSpoiler.style.display !== 'initial') {
          elmSpoiler.style.display = 'initial';
        } else {
          elmSpoiler.style.display = null;
        }
      }, true);
    }
    // untagged links
    let elmsLink = elm.getElementsByTagName('a');
    for(let link of elmsLink) {
      if(link.getAttribute('data-untagged')) {
        // youtube
        if(new RegExp(/^https:\/\/www\.youtube\.com\/watch\?v=([^&\s?]*)$/).test(link.innerText)) {
          // youtube container
          let elmReplaceLink = document.createElement('div');
          elmReplaceLink.setAttribute('class', 'bb-youtube');
          // youtube id
          let strVideoId = link.innerText.replace(/^https:\/\/www\.youtube\.com\/watch\?v=([^&\s?]*)$/gm, '$1');
          // youtube iframe
          let elmIFrame = document.createElement('iframe');
          elmIFrame.setAttribute('src', 'https://www.youtube.com/embed/'+strVideoId+'?enablejsapi=1&origin=https://darastrix.dynip.sapo.pt');
          elmIFrame.setAttribute('allowfullscreen', true);
          elmReplaceLink.appendChild(elmIFrame);
          // replace elmReplaceSpan with youtube container
          link.parentNode.replaceChild(elmReplaceLink, link);
          continue;
        }
        // image
        let img = new Image();
        img.addEventListener('load', () => {
          // image container
          let elmReplaceLink = document.createElement('div');
          elmReplaceLink.setAttribute('class', 'bb-image');
          // image element
          elmReplaceLink.appendChild(img);
          // replace link with image
          link.parentNode.replaceChild(elmReplaceLink, link);
        });
        img.src = link.innerText;
        // video/audio
        let media = document.createElement("VIDEO");
        let mediaLoaded = false;
        media.addEventListener('loadeddata', (e) => {
          if(mediaLoaded) {
            return;
          }
          // media container
          let elmReplaceLink = document.createElement('div');
          if(media.videoWidth > 0 && media.videoHeight > 0) {
            // video
            elmReplaceLink.setAttribute('class', 'bb-video');
          } else {
            // audio
            elmReplaceLink.setAttribute('class', 'bb-audio');
          }
          // media element
          media.setAttribute('controls', 'true');
          media.volume = 0.5;
          elmReplaceLink.appendChild(media);
          // replace link with image
          link.parentNode.replaceChild(elmReplaceLink, link);
          mediaLoaded = true;
        });
        media.src = link.innerText;
        media.load();
      }
    }
    // return parsed html
    return elm;
  }

  convertCSSUnitsToPixels(quantity, units, htmlFZ=16, parentFZ=16) {
    let result;
    switch(units) {
      case 'cm':
        // centimeters (2.54cm = 96px)
        result = Math.round(quantity * 96 / 2.54);
        break;
      case 'mm':
        // millimeters (25.4cm = 96px)
        result = Math.round(quantity * 96 / 25.4);
        break;
      case 'in':
        // inches (1in = 96px)
        result = Math.round(quantity * 96);
        break;
      case 'px':
        // pixels
        result = quantity;
        break;
      case 'pt':
        // points (1pt = 1/72 of 1in)(1in = 96px)
        result = Math.round( (quantity / 72) * 96);
        break;
      case 'pc':
        // picas (1pc = 12pt)(1pt = 1/72 of 1in)(1in = 96px)
        result = Math.round( ( (quantity*12) / 72) * 96);
        break;
      case 'em':
        // Relative to the font-size of the element (2em means 2 times the size of the current font)
        result = Math.round(quantity * parentFZ);
        break;
      case 'ex':
        // Relative to the x-height of the current font (rarely used)
        // WARNING: just a placeholder. not converted properly.
        result = Math.round(quantity * parentFZ);
        break;
      case 'ch':
        // Relative to the width of the "0" (zero)
        // WARNING: just a placeholder. not converted properly.
        result = Math.round(quantity * parentFZ);
        break;
      case 'rem':
        // Relative to font-size of the root element
        result = Math.round(quantity * htmlFZ);
        break;
      case 'vw':
        // Relative to 1% of the width of the viewport*
        result = Math.round(quantity * (window.innerWidth / 100) );
        break;
      case 'vh':
        // Relative to 1% of the height of the viewport*
        result = Math.round(quantity * (window.innerHeight / 100) );
        break;
      case 'vmin':
        // Relative to 1% of viewport's* smaller dimension
        let vmin = (window.innerWidth < window.innerHeight) ? window.innerWidth : window.innerHeight;
        result = Math.round(quantity * (vmin / 100) );
        break;
      case 'vmax':
        // Relative to 1% of viewport's* larger dimension
        let vmax = (window.innerWidth > window.innerHeight) ? window.innerWidth : window.innerHeight;
        result = Math.round(quantity * (vmax / 100) );
        break;
      case '%':
        // Relative to the parent element
        result = Math.round(quantity * parentFZ / 100);
        break;
      default:
        result = 0;
        break;
    }
    return result;
  }

}

export default BBCode;