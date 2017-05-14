/*
    > 400 - bad request
    > 401 - unauthorized 
    > 403 - forbiden
    > 404 - not found
*/

class HttpError extends Error{
    constructor(code, message){
        super(message);
        this.code = code;
    }
}

module.exports = HttpError;