/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');

const quiz = [
  {
    country: "india",
    capital: "new delhi"
  },
  {
    country: "united kingdom",
    capital: "london"
  },
  {
    country: "indonesia",
    capital: "jakarta"
  },
  {
    country: "germany",
    capital: "berlin"
  },
  {
    country: "canada",
    capital: "ottawa"
  },
  {
    country: "cuba",
    capital: "havana"
  },
  {
    country: "south korea",
    capital: "seoul"
  },
  {
    country: "spain",
    capital: "madrid"
  },
  {
    country: "australia",
    capital: "canberra"
  },
  {
    country: "turkey",
    capital: "ankara"
  },
]



const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const speechText = 'Welcome to the Capital City Quiz, Are you ready to start the game?';
    const attributes = {};
    attributes.currentScore = 0;
    attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const quizIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
  },
  handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const sessionAttributes = attributesManager.getSessionAttributes();
    sessionAttributes.currentScore = 0;
    const speechText = `What is the capital of ${quiz[sessionAttributes.currentScore].country} ?`;

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const capitalCityIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'capitalCityIntent';
  },
  handle(handlerInput) {
    const attributesManager = handlerInput.attributesManager;
    const responseBuilder = handlerInput.responseBuilder;
    const sessionAttributes = attributesManager.getSessionAttributes();
    const city = slotValue(handlerInput.requestEnvelope.request.intent.slots.city);

    var speechText = '';
    if(quiz[sessionAttributes.currentScore].capital == city){ 
      if(sessionAttributes.currentScore == 9){
        speechText = `<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_outro_01'/> Congrats! You got them all correct! Thanks for playing the capital city quiz.`;
          return responseBuilder
          .speak(speechText)
      }
      else{
        sessionAttributes.currentScore++;
        speechText = `Correct! Next question, What is the capital of ${quiz[sessionAttributes.currentScore].country} ?`;
        repromptText = `What is the capital of ${quiz[sessionAttributes.currentScore].country} ?`;
      }
    }
    else{
      speechText = `<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_02'/> Sorry, that is not correct. You got ${sessionAttributes.currentScore} correct. Say get me a life to continue the game.`;
      repromptText = `Would you like to play again from start?`;
    }

    return responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const BuyLifeHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'BuyLifeIntent';
  },
  async handle(handlerInput) {
    // SAVING SESSION ATTRIBUTES TO PERSISTENT ATTRIBUTES,
    // BECAUSE THE SESSION EXPIRES WHEN WE START A CONNECTIONS DIRECTIVE.
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    persistentAttributes.currentSession = sessionAttributes;
    await handlerInput.attributesManager.savePersistentAttributes();

    if(sessionAttributes.currentScore == 8){
      return handlerInput.responseBuilder
        .speak(`Can't buy it for the last question! Game Over!`)
        .getResponse();
    }
    else{
      const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

      return ms.getInSkillProducts(handlerInput.requestEnvelope.request.locale).then((res) => {
        const lifepack = res.inSkillProducts.filter(record => record.referenceName === 'One_Life');
        if (lifepack.length > 0 && lifepack[0].purchasable === 'PURCHASABLE') {
          return handlerInput.responseBuilder
            .addDirective({
              'type': 'Connections.SendRequest',
              'name': 'Buy',
              'payload': {
                'InSkillProduct': {
                  'productId': lifepack[0].productId,
                },
              },
              'token': 'correlationToken',
            })
            .getResponse();
        }
        return handlerInput.responseBuilder
          .speak(`Can't buy it right now!`)
          .getResponse();
      });
    }

  },
};

const BuyLifeResponseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
      (handlerInput.requestEnvelope.request.name === 'Upsell' ||
        handlerInput.requestEnvelope.request.name === 'Buy');
  },
  async handle(handlerInput) {
    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

    // REHYDRATE SESSION ATTRIBUTES AFTER RETURNING FROM THE CONNECTIONS DIRECTIVE.
    if (persistentAttributes.currentSession !== undefined) {
      sessionAttributes.currentScore = persistentAttributes.currentSession.currentScore;
    }
    console.log(`SESSION ATTRIBUTES = ${JSON.stringify(sessionAttributes)}`);

    let speechText = '';

    // IF THE USER DECLINED THE PURCHASE.
    if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'DECLINED') {
      speechText = `Do you want to play the game again?`;
    } else if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED') {
      // IF THE USER SUCCEEDED WITH THE PURCHASE.
      speechText += `The capital of ${quiz[sessionAttributes.currentScore].country} is ${quiz[sessionAttributes.currentScore].capital}. `;
      sessionAttributes.currentScore++;
      speechText = `Next question, What is the capital of ${quiz[sessionAttributes.currentScore].country} ?`;
      repromptText = `What is the capital of ${quiz[sessionAttributes.currentScore].country} ?`;

    } else if (handlerInput.requestEnvelope.request.payload.purchaseResult === 'ERROR') {
      // IF SOMETHING ELSE WENT WRONG WITH THE PURCHASE.
      speechText = `Not available for sale right now`;
    }

    // CLEAR OUR OUR PERSISTED SESSION ATTRIBUTES.
    persistentAttributes.currentSession = undefined;
    handlerInput.attributesManager.savePersistentAttributes();

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelPurchaseHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      handlerInput.requestEnvelope.request.intent.name === 'CancelPurchaseIntent';
  },
  async handle(handlerInput) {
    // SAVING SESSION ATTRIBUTES TO PERSISTENT ATTRIBUTES,
    // BECAUSE THE SESSION EXPIRES WHEN WE START A CONNECTIONS DIRECTIVE.
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    const persistentAttributes = await handlerInput.attributesManager.getPersistentAttributes();
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();

    persistentAttributes.currentSession = sessionAttributes;
    handlerInput.attributesManager.savePersistentAttributes();

    const ms = handlerInput.serviceClientFactory.getMonetizationServiceClient();

    return ms.getInSkillProducts(handlerInput.requestEnvelope.request.locale).then((res) => {
      const lifepack = res.inSkillProducts.filter(record => record.referenceName === 'One_Life');
      if (lifepack.length > 0 && lifepack[0].purchasable === 'PURCHASABLE') {
        return handlerInput.responseBuilder
          .addDirective({
            'type': 'Connections.SendRequest',
            'name': 'Cancel',
            'payload': {
              'InSkillProduct': {
                'productId': lifepack[0].productId,
              },
            },
            'token': 'correlationToken',
          })
          .getResponse();
      }
      return handlerInput.responseBuilder
        .speak(`Can't buy it right now!`)
        .getResponse();
    });
  },
};

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to the Capital City Quiz. This skill will test your knowledge of the capital cities across the world. Are you ready to start the game?';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return (handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
      (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent' ||
        handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent')) ||
      (handlerInput.requestEnvelope.request.type === 'Connections.Response' &&
        handlerInput.requestEnvelope.request.name === 'Cancel' &&
        handlerInput.requestEnvelope.request.payload.purchaseResult === 'ACCEPTED');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};
const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

function slotValue(slot, useId){
  if(slot.value == undefined){
      return "undefined";
  }
  let value = slot.value;
  let resolution = (slot.resolutions && slot.resolutions.resolutionsPerAuthority && slot.resolutions.resolutionsPerAuthority.length > 0) ? slot.resolutions.resolutionsPerAuthority[0] : null;
  if(resolution && resolution.status.code == 'ER_SUCCESS_MATCH'){
      let resolutionValue = resolution.values[0].value;
      value = resolutionValue.id && useId ? resolutionValue.id : resolutionValue.name;
  }
  return value;
}

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    quizIntentHandler,
    capitalCityIntentHandler,
    BuyLifeHandler,
    BuyLifeResponseHandler,
    CancelPurchaseHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName('CapitalCityQuiz')
  .withAutoCreateTable(true)
  .lambda();
