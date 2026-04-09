const text = "spicy image";
const imageKeywords = [
  "image","picture","photo","pic","send pic","send a picture",
  "selfie","nude","spicy","hot","sexy","nudes","show","pose",
  "take a photo","picture of you","image of you","photo of you",
  "draw","generate","create image","create a picture",
  "what do you look like","show yourself","let me see you",
  "generate image","generate picture"
];
const isImage = imageKeywords.some(keyword => text.toLowerCase().includes(keyword));
console.log('isImageRequest(spicy image)=', isImage);

const replacements = {
  'show your cock': 'artistic nude portrait showcasing natural masculine form with dramatic lighting',
  'show your pussy': 'intimate artistic nude composition with tasteful lighting',
  'send nudes': 'artistic full-body portrait with elegant artistic framing',
  'nudes': 'artistic intimate body portrait',
  'nude': 'tasteful artistic nude',
  'naked': 'artistic full-body portrait',
  'strip': 'progressive artistic undressing sequence',
  'masturbate': 'intimate solo artistic composition',
  'sex': 'intimate artistic pose',
  'fuck': 'passionate artistic intimate pose',
  'suck': 'intimate oral artistic composition',
  'cum': 'climactic artistic moment',
  'spicy': 'sensually charged, tasteful composition',
  'hot': 'sultry, warm-glow portrait',
  'sexy': 'elegant sensual artwork',
  'erotic': 'tasteful erotic art',
  'steamy': 'moody, steamy lighting and atmosphere',
  'porn': 'artistic adult-inspired image',
  'bare': 'sensual artistic exposure',
};
let rephrased = text;
for (const [crude, artistic] of Object.entries(replacements)) {
  const regex = new RegExp(`\\b${crude}\\b`, 'gi');
  rephrased = rephrased.replace(regex, artistic);
}
console.log('rephrased:', rephrased);
