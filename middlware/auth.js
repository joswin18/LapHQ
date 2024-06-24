let is_login = async (req, res, next) => {
    try {
        if (req.session.user_id) {
     
            next();
        } else {
         
            res.redirect('/');
        }
    } catch (error) {
        console.log(error.message);
       
    }
}

let is_logout = async (req, res, next) => {
    try {
        if (req.session.user_id) {
           
            res.redirect('/home');
        } else {
          
            next();
        }
    } catch (error) {
        console.log(error.message);
        
    }
}

module.exports = {
    is_login,
    is_logout
}
