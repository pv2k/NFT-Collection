import {Contract, providers, utils} from "ethers";
import Head from "next/head";
import React, {useRef, useEffect, useState} from "react";
import Web3Modal from "web3modal";
import {abi, NFT_CONTRACT_ADDRESS} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenIdsMinted, setTokenIdsMinted] = useState(0);

  const web3ModalRef = useRef();

  //only the whitelisted addresses will be able to mint 
  const presaleMint = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const tx = await whitelistContract.presaleMint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("You have succesfully minted a NFT cryptodev!");
    }
    catch(err) {
      console.log(err);
    }
  };

  const publicsaleMint = async() => {
    try{
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const publicMint = await whitelistContract.mint({
        value: utils.parseEther("0.01"),
      });
      setLoading(true);
      await publicMint.wait();
      setLoading(false);
      window.alert("You have succesfully minted a NFT cryptodev!");
    }
    catch(err) {
      console.log(err);
    }
  };

  const connectWallet = async() => {
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    }
    catch(err){
      console.log(err);
    }
  };

  const startPresale = async() => {
    try{
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      const tx = await whitelistContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted();
    }
    catch(err) {
      console.log(err);
    }
  };

  const checkIfPresaleStarted = async() => {
    try{
      const provider = await getProviderOrSigner();
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const _presaleStarted = await whitelistContract.presaleStarted();
      if(!_presaleStarted){
        await getOwner();
      }
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    }
    catch(err){
      console.log(err);
      return false;
    }
  };

  const checkIfPresaleEnded = async() => {
    try{
      const provider = await getProviderOrSigner(false);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const _presaleEnded = await whitelistContract.presaleEnded();
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if(hasEnded) {
        setPresaleEnded(true);
      } 
      else {
        setPresaleEnded(false);
      }
      return hasEnded;
    }
    catch(err) {
      console.log(err);
      return false;
    }
  };

  const getOwner = async() => {
    try{
      const provider = await getProviderOrSigner(false);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const _owner = await whitelistContract.owner();
      const signer = await getProviderOrSigner(true);
      const _address = await signer.getAddress();
      //why cant we use provider to getAddress here
      // console.log("address: ", _address.toLowerCase());
      // console.log("owner: ", _owner.toLowerCase());
      if(_address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    }
    catch(err) {
      console.error(err.message);
    }
  };

  const getTokenIdsMinted = async() => {
    try{
      const provider = await getProviderOrSigner(false);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        provider
      );
      const _tokenIdsMinted = await whitelistContract.tokenIds();
      setTokenIdsMinted(_tokenIdsMinted.toString());
    }
    catch(err){
      console.log(err);
    }
  };

  const getProviderOrSigner = async(needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    const { chainId } = await web3Provider.getNetwork();
    if(chainId !== 5){
      console.log(chainId);
      window.alert("Change the network to Goerli");
      throw new Error("Change network to Goerli");
    }
    if(needSigner){
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  useEffect(()=>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();

      const _presaleStarted = checkIfPresaleStarted();
      if(_presaleStarted){
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      const presaleEndedInterval = setInterval(async function(){
        const _presaleStarted = await checkIfPresaleStarted();
        if(_presaleStarted){
          const _presaleEnded = await checkIfPresaleEnded();
          if(_presaleEnded){
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      setInterval(async function() {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    if(!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect your Wallet
        </button>
      );
    }

    if(loading) {
      return(
        <button className={styles.button}>Loading...</button>
      );
    }

    if(isOwner && !presaleStarted) {
      return(
        <button onClick={startPresale} className={styles.button}>Start Presale</button>
      );
    }

    if(!presaleStarted){
      return(
        <div className={styles.description}>Presale hasnt started</div>
      );
    }

    if(presaleStarted && !presaleEnded){
      return (
        <div>
          <div className={styles.description}>
            Presale has started!!! If your address is whitelisted, Mint a
              Crypto Dev 🥳            
          </div>
          <button className={styles.button} onClick={presaleMint}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }

    if(presaleStarted && presaleEnded) {
      return(
        <button className={styles.button} onClick={publicsaleMint}>
          Public Mint 🚀
        </button>
      )      
    }
  };

  return(
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Pirates World</h1>
          <div className={styles.description}>
            Its an NFT collection for pirates in Crypto.
          </div>
          <div className={styles.description}>
            {tokenIdsMinted}/20 NFTs have been minted
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./cryptodevs/0.svg" />
        </div>
      </div>
      <footer>
        Made with &#10084; by pv2k
      </footer>
    </div>
  );
}
