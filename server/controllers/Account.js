const models = require('../models');

const { Account } = models;

const loginPage = (req, res) => {
  // setting up if no users
  Account.AccountModel.getUsers(null, (err, docs) => {
    if (err) console.log(err);
    // if no current users
    if (docs.length === 0) {
      Account.AccountModel.generateHash('password', (salt, hash) => {
        const defaultUser = {
          username: 'abcd',
          salt,
          password: hash,
          firstName: 'John',
          lastName: 'Smith',
          email: '1@1.com',
        };
        const newAccount = new Account.AccountModel(defaultUser);
        newAccount.save();
      });
    }
  });

  res.render('login', { csrfToken: req.csrfToken(), title: 'Contract Solutions' });
};


const logout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

const login = (request, response) => {
  // ?
  const req = request;
  const res = response;

  // casting our roles
  const username = `${req.body.username}`;
  const password = `${req.body.pass}`;

  if (!username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  return Account.AccountModel.authenticate(username, password, (err, account) => {
    if (err || !account) {
      return res.status(401).json({ error: 'Wrong username or password' });
    }

    // B storing data
    req.session.account = Account.AccountModel.toAPI(account);
    req.session.activeComponent = 'profile';

    return res.json({ redirect: '/app', pageToLoad: 'profile' });
  });
};

const getToken = (request, response) => {
  const req = request;
  const res = response;
  const csrfJSON = {
    csrfToken: req.csrfToken(),
  };
  res.json(csrfJSON);
};

module.exports = {
  loginPage,
  login,
  logout,
  getToken,
};
