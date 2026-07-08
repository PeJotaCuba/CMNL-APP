const React = require('react');
const ReactDOMServer = require('react-dom/server');
console.log(ReactDOMServer.renderToString(React.createElement('div', null, NaN)));
console.log(ReactDOMServer.renderToString(React.createElement('div', null, undefined)));
