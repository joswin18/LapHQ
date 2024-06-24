
let islogin = async(req,res,next)=>{
    try {
        if(req.session.admin_id){}
        else{
            res.redirect('/admin')
        }
        next()
    } catch (error) {
      console.log(error.message)  
    }
}


let islogout = async(req,res,next)=>{
    try {
        if(req.session.admin_id){
            res.redirect('/admin/home')
        }
        next()
    } catch (error) {
      console.log(error.message)  
    }
}

module.exports = {
    islogin,
    islogout
}