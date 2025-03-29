const chatDeduction = (remainingChats) => {
  return remainingChats > 0 ? remainingChats - 1 : 0;
};

module.exports = chatDeduction;
