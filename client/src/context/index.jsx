import React, { useContext, createContext, useEffect, useState } from 'react';
import { useAddress, useContract, useContractWrite, useMetamask } from '@thirdweb-dev/react';
import { ethers } from 'ethers';

const StateContext = createContext();

export const StateContextProvider = ({ children }) => {
  const { contract } = useContract('0xa7B9Dc8e87f79b628664CFAf71f55D8cF2AcCa4A');
  const address = useAddress();
  const connect = useMetamask();

  const [createCampaign, setCreateCampaign] = useState(null);

  useEffect(() => {
    if (contract) {
      const { mutateAsync } = useContractWrite(contract, 'createCampaign');
      setCreateCampaign(() => mutateAsync);
    } else {
      console.error('Contract instance is not available.');
    }
  }, [contract]);

  const publishCampaign = async (form) => {
    if (!createCampaign) {
      console.error('createCampaign method is not available.');
      return;
    }

    try {
      const data = await createCampaign({
        args: [
          address, // owner
          form.title, // title
          form.description, // description
          ethers.utils.parseUnits(form.target, 18), // target
          new Date(form.deadline).getTime(), // deadline
          form.image // image URL
        ]
      });
      console.log("Contract call success", data);
    } catch (error) {
      console.error("Contract call failure", error);
    }
  }

  const getCampaigns = async () => {
    if (!contract) return [];

    try {
      const campaigns = await contract.call('getCampaigns');
      console.log('Campaigns:', campaigns);
      return campaigns.map((campaign, i) => ({
        owner: campaign.owner,
        title: campaign.title,
        description: campaign.description,
        target: ethers.utils.formatEther(campaign.target.toString()),
        deadline: campaign.deadline.toNumber(),
        amountCollected: ethers.utils.formatEther(campaign.amountCollected.toString()),
        image: campaign.image,
        pId: i
      }));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  }

  const getUserCampaigns = async () => {
    try {
      const allCampaigns = await getCampaigns();
      return allCampaigns.filter((campaign) => campaign.owner === address);
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
    }
  }

  const donate = async (pId, amount) => {
    if (!contract) return;

    try {
      const data = await contract.call('donateToCampaign', [pId], { value: ethers.utils.parseEther(amount) });
      console.log('Donation successful:', data);
      return data;
    } catch (error) {
      console.error('Error donating to campaign:', error);
    }
  }

  const getDonations = async (pId) => {
    if (!contract) return [];

    try {
      const donations = await contract.call('getDonators', [pId]);
      const numberOfDonations = donations[0].length;
      return Array.from({ length: numberOfDonations }, (_, i) => ({
        donator: donations[0][i],
        donation: ethers.utils.formatEther(donations[1][i].toString())
      }));
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  }

  return (
    <StateContext.Provider
      value={{ 
        address,
        connect,
        createCampaign: publishCampaign,
        getCampaigns,
        getUserCampaigns,
        donate,
        getDonations
      }}
    >
      {children}
    </StateContext.Provider>
  );
}

export const useStateContext = () => useContext(StateContext);
