let html = "<p>Line 1</p><p>Line 2<br/>Line 3</p>";
html = html.replace(/<p[^>]*>/gi, '').replace(/<\/p>/gi, '\n');
html = html.replace(/<div[^>]*>/gi, '').replace(/<\/div>/gi, '\n');
html = html.replace(/<tr[^>]*>/gi, '').replace(/<\/tr>/gi, '\n');
html = html.replace(/<br\s*[\/]?>/gi, '\n');
let extractedText = html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<(?!(\/)?(b|strong|i|em|u|span)\b)[^>]+>/gi, '') 
    .replace(/ +/g, ' ')
    .trim();
console.log(JSON.stringify(extractedText));
