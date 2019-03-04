'use strict';

const axios = require('axios');

module.exports.hello = async (e, context, cb) => {

    context.callbackWaitsForEmptyEventLoop = true;

    try{

        // This is code that will parse a query string like the exercise asked for.
        // I'm not going to use it because event.queryStringParameters.<parameter> will do the same thing.
        const queryString = '/status-email?accountId=8675309&accountsEndpoint=account&usersEndpoint=user&emailEndpoint=sendGrid';
        let parsed = parseQs(queryString);

        let accountId = e.queryStringParameters.accountId;
        let accountsEndpoint = e.queryStringParameters.accountsEndpoint;
        let usersEndpoint = e.queryStringParameters.usersEndpoint;
        let emailEndpoint = e.queryStringParameters.emailEndpoint;

        if(accountId && accountsEndpoint && usersEndpoint && emailEndpoint){

            let endpoint = process.env.ENDPOINT;
            let accountsUri = `${accountsEndpoint}/${accountId}/`;

            let accounts = await axionator(endpoint, accountsUri);

            let users = [];

            if(accounts.data.hasOwnProperty('users')){
                users = [...accounts.data.users];
            }

            let promises_promises = [];

            // Make all the requests in parallel.
            users.map(async (user) => {
                let userIdString = String(user);
                let userUri = `${usersEndpoint}/${userIdString}/`;

                promises_promises.push(axionator(endpoint, userUri));
            });

            let cleanedUpUsers = [];

            // Uncomment this to make it seem like we are doing things that take time.
            // promises_promises.push(new Promise(resolve => setTimeout(resolve, 3000)));

            // After all the userInfo endpoint responses have come back.
            let delivered = Promise.all(promises_promises);

            return delivered.then(async (values) => {

                for(let i = 0; i < values.length; i++){
                    if(typeof values[i] === "object"){
                        cleanedUpUsers.push(values[i].data);
                    }
                }

                let emailed = await axionator(endpoint, emailEndpoint, "post", cleanedUpUsers);

                return response(emailed.data);

            });



        } else {

            let message = 'The query signiture did not meet requirements. Please check your request.';
            cb(message);

        }
    } catch (e){
        cb(e);
    }

};

module.exports.accountUsers = (e, context, cb) => {
    let accountId = e.pathParameters.accountId;

    // Do some lookup in a DB. I prefer Mongo Atlas. Populate with dummy data for now.
    let json = { status: 'ACTIVE', users: [123456, 123457, 123458] };


    // This response is not sending.
    let going_to_respond = response(json);

    cb(null, going_to_respond);
};

module.exports.userInfo = (e, context, cb) => {
    let userId = e.pathParameters.userId;

    let returnObject;
    // This is totally a DB lookup.
    switch (userId) {
        case "123456":
            returnObject = { userId: 123456, firstName: 'Scott', lastName: 'Bakula', email: 'scott@timetravelingcaptain.com' };
            break;
        case "123457":
            returnObject = { userId: 123457, firstName: 'Richard', lastName: 'Stallman', email: 'rstallman@penguin.og' };
            break;
        case "123458":
            returnObject = { userId: 123458, firstName: 'Vin', lastName: 'Diesel', email: 'furian@nerdybuff.com' };
    }

    cb(null, response(returnObject));
};

module.exports.emailEndpoint = (e, context, cb) => {
    var data = JSON.parse(e.body);

    cb(null, response(data));
};

function parseQs(qs) {

    let trimRegex = /(?:^\/.*\?)(.*)/;
    let trimmed = qs.match(trimRegex, qs);
    let to_return = {};

    if(Array.isArray(trimmed) && trimmed.length == 2){

        let smaller_pieces = trimmed[1].split('&');

        for(let i = 0; i < smaller_pieces.length; i++)
        {
            let granular = smaller_pieces[i].split('=');
            let k = granular[0];
            let v = granular[1];
            to_return[k] = v;
        }
    }

    return to_return;
}

function response(body, statusCode = 200, headers = null){

    let modify_headers = {
        "Content-Type": "application/json",
    };

    if(typeof headers === 'object'){

        // I was using the spread operator here but had a problem with babel not recognizing it.
        // I pick my battles.
        modify_headers = Object.assign(modify_headers, headers);

    }

    let to_return = {
        statusCode: statusCode,
        headers: modify_headers,
        body: null
    };

    body = JSON.stringify(body);

    to_return.body = body;

    return to_return;
}

async function axionator(url, uri, method="get", data = {}){

    let endpoint = url + uri;

    let got = {};

    method = method.toLowerCase();

    if(method == "get"){
        got = axios.get(endpoint);
    } else if(method == "post") {
        got = axios.post(endpoint, data);
    }

    return(got);
}