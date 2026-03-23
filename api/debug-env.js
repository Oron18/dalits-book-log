module.exports = (req, res) => {
  const key = process.env.JSONBIN_API_KEY || '';
  const id = process.env.JSONBIN_BIN_ID || '';
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    idValue: id,
    idLength: id.length,
    keyLength: key.length,
    keyFirst8: key.substring(0, 8),
    keyLast8: key.substring(key.length - 8),
    keyHasNewline: key.includes('\n'),
    keyHasCarriageReturn: key.includes('\r'),
    keyHasSpace: key.includes(' '),
    keyCharCodes: [...key.substring(0, 5)].map(c => c.charCodeAt(0)),
  });
};
