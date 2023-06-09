'use strict' ;

const{Contract} = require ('fabric-contract-api');

const propertyStatusMap = {
	
	'registered' : 'REGISTERED',
	'onSale' : 'ON_SALE'
};


class UserContract extends Contract{
    constructor(){
        // Nameing the Smart Contract
        super('regnet.usercontract');
    }
    // Message to show once the network is instatiated
    async instantiate(ctx){
        console.log('Regnet User Smart Contract Instantiated');
    }
/* ******************************FUNCTIONS IN USER CONTRACT************************************************** */

// Request to add a new user
    async requestNewUser(ctx,username,email,contactNo,SSN){

        const userKey = ctx.stub.createCompositeKey('regnet.users',[username,SSN]);
        let newUserObject ={
            username: username,
            email: email,
            contactNo: contactNo,
            SSN: SSN,
            createdAt: ctx.stub.getTxTimestamp()
        };
        await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(newUserObject)));
        return newUserObject;
        
    }
// To view user details from the Ledger
    async viewUser(ctx,username,SSN){
        const userKey = ctx.stub.createCompositeKey('regnet.users',[username,SSN]);
        let userBuffer = await ctx.stub.getState(userKey);
        if(userBuffer){
            return JSON.parse(userBuffer.toString());
        }else{
            return 'Invalid user details';
        }
    }
    async rechargeAccount(ctx, username, SSN, banktransactionID){
        
        let a= 'upg100', b= 'upg500', c= 'upg1000';
        if(banktransactionID==a||b||c){
            const userKey = ctx.stub.createCompositeKey('regnet.users', [username, SSN]);
            const userBuffer = await ctx.stub.getState(userKey);
            let newUserRequest = JSON.parse(userBuffer.toString());
           
            if(banktransactionID==a){
                newUserRequest.upgradCoins =100;
            } else if(banktransactionID==b){
                newUserRequest.upgradCoins=500;
            } else{
                newUserRequest.upgradCoins=1000;
            }
            const usernewBuffer = Buffer.from(JSON.stringify(newUserRequest));
            await ctx.stub.putState(userKey, usernewBuffer);
    
    
        }
        else{
            return "Invalid Bank Transaction ID";
        }
    }
// Request to register a new property
    async propertyRegRequest(ctx,username,propertyID,propertyStatus,price,SSN){

        const propertyKey = ctx.stub.createCompositeKey('regnet.property',[propertyID]);
        let propertyObject ={
            username: username,
            propertyID: propertyID,
            propertyStatus: propertyStatusMap[propertyStatus],
            owner: ctx.stub.createCompositeKey('regnet.users', [username,SSN]),
            price: price,
            SSN: SSN,
            createdAt: ctx.stub.getTxTimestamp()
        };
        await ctx.stub.putState(propertyKey, Buffer.from(JSON.stringify(propertyObject)));
        return propertyObject;
    }
 //To view property details from the network   
    async viewProperty(ctx,propertyID){
        const propertyKey =ctx.stub.createCompositeKey('regnet.property',[propertyID]);
        const propertyBuffer= await ctx.stub.getState(propertyKey);
        if(propertyBuffer){
            return JSON.parse(propertyBuffer.toString());
        }else{
            return 'invalid property details';
        }
    }
// To make changes in the property asset from the network
    async updateProperty(ctx,propertyID,username,SSN,propertyStatus){

        if('userMSP'!=ctx.clientIdentity.getID()){
            throw new Error("Not a authorised ID to perfom operation");
        }

        let propertyKey =ctx.stub.createCompositeKey('regnet.property',[propertyID]);
        let propBuffer = await ctx.stub.getState(propertyKey);

        //check if the property already exist or not
        
        if(propBuffer){
            return JSON.parse(propBuffer.toString());
        }else{
            return 'Invalid Property Details, already have this property';
        }
        
        const userKey = ctx.stub.createCompositeKey('regnet.users',[username,SSN]);
        let userBuffer = await ctx.stub.getState(userKey);
        if(userBuffer){
            return JSON.parse(userBuffer.toString());
        }else{
            return 'Invalid User Details.No user exists with provided '+ username +'and'+ SSN;
        }
        
        
        if(!propertyStatusMap[propertyStatus]){
            throw new Error ('Invalid status');
        }

        let newPropOject = JSON.parse(propBuffer.toString());
        if(userKey == newPropOject.owner){
            newPropOject.propertyStatus= propertyStatusMap[propertyStatus];
            newPropOject.createdAt= ctx.stub.getTxTimestamp();
            newPropOject.updatedAt= ctx.stub.getTxTimestamp();

            await ctx.stub.putState(propertyKey, Buffer.from(JSON.stringify(newPropOject)));
            return newPropOject;
        }else{
            throw new Error('Transaction declines as the user is not the owner of the property');
        }
    }
    async purchaseProperty(ctx,propertyID,username,SSN){

        if('userMSP'!=ctx.clientIdentity.getID()){
            throw new Error("Not a authorised ID to perfom the Operation");
        }
        
        let propertyKey= ctx.stub.createCompositeKey('regnet.property',[propertyID]);
        let propBuffer= ctx.stub.getState(propertyKey);
        //checking if the property exist
        if(propBuffer){
            return JSON.parse(propBuffer.toString());
        }else{
            return 'Invalid property details';
        }

        let userKey= ctx.stub.createCompositeKey('regnet.users',[username,SSN]);
        let userBuffer= ctx.stub.getState(userKey);
        //checking if the user does exist
        if(userBuffer){
            return JSON.parse(userBuffer.toString());
        }else{
            return 'No user exist with the given username and SSN';
        }
        // checking the status of the property whether it is on sale 
        let newPropOject = JSON.parse(propBuffer.toString());
        if(newPropOject.propertyStatus!=propertyStatusMap['onSale']){
            throw new Error("property not for sale");
        }

        if(userKey!=newPropOject.owner){
            const userObject= JSON.parse(userBuffer.toString());
            if(userObject.upgradCoins >= newPropOject.price){
                let ownerBuffer= ctx.stub.getState(userKey);
                let ownerUserObject = JSON.parse(ownerBuffer.toString());

                userObject.upgradCoins = userObject.upgradCoins - newPropOject.price;// Debiting from buyer account
                ownerUserObject = ownerUserObject.upgradCoins + newPropOject.price;// crediting to Owner account
                
                newPropOject.owner = userKey;
                newPropOject.propertyStatus = propertyStatusMap['registered'];
                newPropOject.updatedAt = ctx.stub.getTxTimestamp();

                await ctx.stub.putState(userKey, Buffer.from(JSON.stringify(userObject)));
                await ctx.stub.putState(propertyKey,Buffer.from(JSON.stringify(newPropOject)));
                return newPropOject;
            }
            throw new Error('No sufficient balance to buy the property');
        }else{
            throw new Error('Owner cannot buy the property, given ID owns the property');
        }

    }


}
module.exports = UserContract;
