'use strict';

//Importing Contract class from fabric api
const {Contract} = require('fabric-contract-api');

const propertyStatusMap = {
	
	'registered' : 'REGISTERED',
	'onSale' : 'ON_SALE'
};

////////////////////////////////////// Smart contracts to be triggered by Property Registrar //////////////////////////////////////////

//Initialising RegistrarContract constructor extending from the Contract class
class RegistrarContract extends Contract {
    constructor() {
		// Naming the smart contract 
		super('regnet.registrarcontract');
	}
    async instantiate(ctx) {
		console.log('Regnet Registrar Smart Contract Instantiated');
	}

    //Smart contract to Approve a new user on the ledger based on the request received 
    async approveNewUser(ctx, username, SSN) {
		
		const userKey = ctx.stub.createCompositeKey('regnet.users', [username, SSN]);

		//Fetching user details from ledger...
		let buffer = await ctx.stub.getState(userKey).catch(err => console.log(err));

		//Converting buffer to JSON object...
		let userObject = JSON.parse(buffer.toString());
		
		//Checking for already Approved user...
		
			userObject.upgradCoins = 0; //Updating user object and initiating the upgradCoins count with 0
			userObject.updatedAt = ctx.stub.getTxTimestamp(); //Capturing the time of status update
	
			// Convert the JSON object to a buffer and send it to blockchain for storage
			let dataBuffer = Buffer.from(JSON.stringify(userObject));
			await ctx.stub.putState(userKey, dataBuffer);
				
			return userObject;	
		}        
	


    //Smart Contract to view the current state of any user
	async viewUser(ctx,username,SSN){
        const userKey = ctx.stub.createCompositeKey('regnet.users',[username,SSN]);
        const userBuffer = await ctx.stub.getState(userKey);
        if(userBuffer){
            return JSON.parse(userBuffer.toString());
        }else{
            return 'Invalid user details';
        }
    }


    //Smart Contract to view the current state of any property registered on the ledger
    async viewProperty (ctx, propertyID) {
        
        const propertyKey = ctx.stub.createCompositeKey('regnet.property', [propertyID]);

		//Fetching the property object...
		let buffer = await ctx.stub.getState(propertyKey).catch(err => console.log(err));
		let propertyObject = JSON.parse(buffer.toString());
				
		return propertyObject;
    }


    //Smart Contract to approve property registration
    async approvePropertyRegistration (ctx, propertyID){
        
		const propertyKey = ctx.stub.createCompositeKey('regnet.property', [propertyID]);

		//Fetching the property object...
		let buffer = await ctx.stub.getState(propertyKey).catch(err => console.log(err));
		let propertyObject = JSON.parse(buffer.toString());

		//Updating property object... 
		propertyObject.propertyStatus=propertyStatusMap['registered'];
		propertyObject.updatedAt = ctx.stub.getTxTimestamp(); //Capturing the time of status update

		//Putting updated property details into the ledger...
		let dataBuffer = Buffer.from(JSON.stringify(propertyObject));
		await ctx.stub.putState(propertyKey, dataBuffer);
		
		return propertyObject;
    }
    
}

//Exporting the chaincode...
module.exports = RegistrarContract;
