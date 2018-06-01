/*
 * Copyright (c) 2018, Gnock
 * Copyright (c) 2018, The Masari Project
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


import {DestructableView} from "../lib/numbersLab/DestructableView";
import {VueVar, VueWatched} from "../lib/numbersLab/VueAnnotate";
import {AppState} from "../model/AppState";
import {Password} from "../model/Password";
import {Wallet} from "../model/Wallet";
import {KeysRepository} from "../model/KeysRepository";
import {BlockchainExplorerProvider} from "../providers/BlockchainExplorerProvider";
import {BlockchainExplorerRpc2} from "../model/blockchain/BlockchainExplorerRpc2";

AppState.enableLeftMenu();

let blockchainExplorer : BlockchainExplorerRpc2 = BlockchainExplorerProvider.getInstance();

class ImportView extends DestructableView{
	@VueVar(false) viewOnly : boolean;

	@VueVar('') privateSpendKey : string;
	@VueVar(false) validPrivateSpendKey : boolean;
	@VueVar('') privateViewKey : string;
	@VueVar(false) validPrivateViewKey : boolean;
	@VueVar('') publicAddress : string;
	@VueVar(false) validPublicAddress : boolean;

	@VueVar('') password : string;
	@VueVar('') password2 : string;
	@VueVar(false) insecurePassword : boolean;
	@VueVar(false) forceInsecurePassword : boolean;
	@VueVar(0) importHeight : number;

	constructor(container : string){
		super(container);
	}

	formValid(){
		if(this.password != this.password2)
			return false;

		if(!(this.password !== '' && (!this.insecurePassword || this.forceInsecurePassword)))
			return false;

		if(!(
			(!this.viewOnly && this.validPrivateSpendKey && this.validPrivateViewKey) ||
			(this.viewOnly && this.validPublicAddress && this.validPrivateViewKey)
		))
			return false;
		return true;
	}

	importWallet(){
		let self = this;
		blockchainExplorer.getHeight().then(function(currentHeight){
			let newWallet = new Wallet();
			if(self.viewOnly){
				let decodedPublic = cnUtil.decode_address(self.publicAddress);
				newWallet.keys = {
					priv:{
						spend:'',
						view:self.privateViewKey
					},
					pub:{
						spend:decodedPublic.spend,
						view:decodedPublic.view,
					}
				};
			}else {
				let viewkey = self.privateViewKey;
				if(viewkey === ''){
					viewkey = cnUtil.generate_keys(cnUtil.cn_fast_hash(self.privateSpendKey));
				}
				newWallet.keys = KeysRepository.fromPriv(self.privateSpendKey, viewkey);
			}

			let height = self.importHeight;//never trust a perfect value from the user
			if(height >= currentHeight){
				height = currentHeight-1;
			}
			height = height - 10;

			if(height < 0)height = 0;
			newWallet.lastHeight = height;
			newWallet.creationHeight = newWallet.lastHeight;

			AppState.openWallet(newWallet, self.password);
			window.location.href = '#account';
		});
	}

	@VueWatched()
	passwordWatch(){
		if(!Password.checkPasswordConstraints(this.password, false)){
			this.insecurePassword = true;
		}else
			this.insecurePassword = false;
	}

	@VueWatched()
	importHeightWatch(){
		if(this.importHeight < 0){
			this.importHeight = 0;
		}
		this.importHeight = parseInt(''+this.importHeight);
	}

	@VueWatched()
	privateSpendKeyWatch(){
		this.validPrivateSpendKey = this.privateSpendKey.length == 64;
	}

	@VueWatched()
	privateViewKeyWatch(){
		this.validPrivateViewKey = this.privateViewKey.length == 64 || (!this.viewOnly && this.privateViewKey.length == 0);
	}

	@VueWatched()
	publicAddressWatch(){
		try{
			cnUtil.decode_address(this.publicAddress);
			this.validPrivateViewKey = true;
		}catch(e){
			this.validPrivateViewKey = false;
		}
	}

	forceInsecurePasswordCheck(){
		let self = this;
		self.forceInsecurePassword = true;
	}

}

new ImportView('#app');
