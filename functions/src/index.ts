import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin'
import firebaseAccountCredentials from "../bk-test-44762-firebase-adminsdk-oldj1-550742898f.json"
import { v4 as uuidv4 } from 'uuid';

const serviceAccount2 = firebaseAccountCredentials as admin.ServiceAccount


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount2)
});

const db = admin.firestore();

export const bkTest = functions.https.onRequest((request, response) => {
 response.send("From BookKeeper cloud funtions!");
});


/*
Need to add listner for new connection request notification
Tasks:
1) Generate notification to appropriate user on new request
2) Add entry on "event_notification" collection

*/
export const onNewConRequest = 
        functions.firestore
            .document("connection_request/{docId}")
            .onCreate(async (change,context) =>{

                // const docId =  context.params.docId
                const connectionRequest = change.data() as FirebaseFirestore.DocumentData

                const notId = uuidv4()
                const subject = "bk_connection"
                const title = 'New connection request'

                const eventNotification = {
                    id : notId,
                    subject : subject,
                    title : title,
                    userId : connectionRequest.partnerUserId,
                    created : new Date()
                  };

                await db.collection("event_notification").doc(notId).set(eventNotification)

                const payload = {
                    data:{
                        bk_subject : String('bk_connection')
                    },
                    notification: {
                        title : title
                    }
                }
                return admin.messaging().sendToTopic(connectionRequest.partnerUserId,payload)
        }
)

export const onConRequestApproval = 
        functions.firestore
            .document("connection_request/{docId}")
            .onUpdate(async (change,context) =>{

                //check if approved
                const prevDoc = change.before.data() as FirebaseFirestore.DocumentData
                const curDoc = change.after.data() as FirebaseFirestore.DocumentData

                if(curDoc.active === true && 
                    prevDoc.approvalStatus === 'PENDING' &&
                    curDoc.approvalStatus === 'APPROVED'){

                        const notId = uuidv4()
                        const subject = "bk_connection"
                        const title = 'Connection request approved'
        
                        const eventNotification = {
                            id : notId,
                            subject : subject,
                            title : title,
                            userId : curDoc.requesterUserId,
                            created : new Date()
                          };
        
                        await db.collection("event_notification").doc(notId).set(eventNotification)
        
                        const payload = {
                            data:{
                                bk_subject : String('bk_connection')
                            },
                            notification: {
                                title : title
                            }
                        }
                        return admin.messaging().sendToTopic(curDoc.requesterUserId,payload)
                    }

                return Promise.resolve()

            })



export const onSlShareRequest = 
            functions.firestore
                .document("sl_share_request/{docId}")
                .onCreate(async (change,context) =>{
    
                    // const docId =  context.params.docId
                    const slShareRequest = change.data() as FirebaseFirestore.DocumentData
                    const slId = slShareRequest.documentPath as string
                    const fetchedSlDoc = await db.doc(slId).get()
                    const shoppingList = fetchedSlDoc.data() as FirebaseFirestore.DocumentData
                    const notId = uuidv4()

                    let subject:string
                    let title:string
                    let description:string
                    let eventNotification:any
                    let payload:any
                    
                    if(slShareRequest.approvalStatus ==='PENDING'){
                        subject = "bk_shopping_list_share_req"
                        title = "Shopping list share request"
                        description = 'Shopping list share request for list "'+shoppingList.title+'"'
    
                        eventNotification = {
                            id : notId,
                            subject : subject,
                            title : title,
                            userId : slShareRequest.partnerId,
                            description : description,
                            created : new Date()
                          };
          
                          payload = {
                              data:{
                                  bk_subject : subject
                              },
                              notification: {
                                  title : title,
                                  body : description
                              }
                          }

                    }else if(slShareRequest.approvalStatus ==='APPROVED'){

                        subject = "bk_shopping_list"
                        title = "Shopping list received"
                        description = 'New Shopping list "'+shoppingList.title+'" received.'
    
                        eventNotification = {
                            id : notId,
                            subject : subject,
                            title : title,
                            userId : slShareRequest.requesterId,
                            description : description,
                            created : new Date()
                          };
          
                          payload = {
                              data:{
                                  bk_subject : subject
                              },
                              notification: {
                                  title : title,
                                  body : description
                              }
                          }

                    }

                    
                    if(slShareRequest.approvalStatus ==='PENDING'){
                          await db.collection("event_notification").doc(notId).set(eventNotification)
                          return admin.messaging().sendToTopic(slShareRequest.partnerId,payload)

                    }else if(slShareRequest.approvalStatus ==='APPROVED'){
                          await db.collection("event_notification").doc(notId).set(eventNotification)
                          return admin.messaging().sendToTopic(slShareRequest.requesterId,payload)

                    }else{
                        return Promise.resolve(null)
                    }
            }
    )

export const onSlShareApproval = 
            functions.firestore
                .document("sl_share_request/{docId}")
                .onUpdate(async (change,context) =>{
    
                    //check if approved
                    const prevDoc = change.before.data() as FirebaseFirestore.DocumentData
                    const curDoc = change.after.data() as FirebaseFirestore.DocumentData

                    if(prevDoc.approvalStatus==='PENDING' && 
                        curDoc.approvalStatus==='APPROVED'){

                        const slShareRequest = curDoc
                        const slId = slShareRequest.documentPath as string
                        const shoppingList = ((await db.doc(slId).get()).data()) as FirebaseFirestore.DocumentData
                        const notId = uuidv4()

                        const subject = "bk_shopping_list"
                        const title = "Shopping list received"
                        const description = 'Request approved for "'+shoppingList.title+'" shopping list.'
    
                        const eventNotification = {
                            id : notId,
                            subject : subject,
                            title : title,
                            userId : slShareRequest.requesterId,
                            description : description,
                            created : new Date()
                            };
            
                        const payload = {
                                data:{
                                    bk_subject : subject
                                },
                                notification: {
                                    title : title,
                                    body : description
                                }
                            }

                            await db.collection("event_notification").doc(notId).set(eventNotification)
                            return admin.messaging().sendToTopic(slShareRequest.requesterId,payload)

                    }else{
                        return Promise.resolve(null)
                    }
            }
    )