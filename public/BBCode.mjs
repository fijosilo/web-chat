
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
    parsedString = parsedString.replace(/\[size=(\d*)\]([\w\W]*?)\[\/size\]/gm, '<span style="font-size: $1pt;">$2</span>');
    parsedString = parsedString.replace(/\[style size=(\d*)\]([\w\W]*?)\[\/style\]/gm, '<span style="font-size: $1pt;">$2</span>');
    parsedString = parsedString.replace(/\[size=(\d*[a-z%]*)\]([\w\W]*?)\[\/size\]/gm, '<span style="font-size: $1;">$2</span>');
    parsedString = parsedString.replace(/\[style size=(\d*[a-z%]*)\]([\w\W]*?)\[\/style\]/gm, '<span style="font-size: $1;">$2</span>');
    // font color
    parsedString = parsedString.replace(/\[color=([\w#\(\),]*)\]([\w\W]*?)\[\/color\]/gm, '<span style="color: $1;">$2</span>');
    parsedString = parsedString.replace(/\[style color=([\w#\(\),]*)\]([\w\W]*?)\[\/style\]/gm, '<span style="color: $1;">$2</span>');
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
    parsedString = parsedString.replace(/\[url\]([\w\W]*?)\[\/url\]/gm, '<a href="$1">$1</a>');
    // link (named)
    parsedString = parsedString.replace(/\[url=([\w\W]*?)\]([\w\W]*?)\[\/url\]/gm, '<a href="$1">$2</a>');
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
    parsedString = parsedString.replace(/\[youtube\]([\w\W]*?)\[\/youtube\]/gm, '<div class="bb-youtube"><iframe src="https://www.youtube.com/embed/$1?enablejsapi=1" allowfullscreen></iframe></div>');
    // return parsed string
    return parsedString;
  }

}

export default BBCode;