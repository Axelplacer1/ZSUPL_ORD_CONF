import DynamicPage from "sap/f/DynamicPage";
import { Button$PressEvent } from "sap/m/Button";
import Dialog, { Dialog$AfterCloseEvent } from "sap/m/Dialog";
import Page from "sap/m/Page";
import Event from "sap/ui/base/Event";
import Control from "sap/ui/core/Control";
import Controller from "sap/ui/core/mvc/Controller";


/**
 * @namespace au.com.iesol.po.confirmation.variancewftask.controller
 */
export default class BaseController extends Controller {

    /*eslint-disable @typescript-eslint/no-empty-function*/
    public onInit(): void {

    }
    public getModel(sName?: String): any {
        return (this as any).getView().getModel(sName);
    }

    public getModelMessages(): any {
        let oMsgModel = sap.ui.getCore().getMessageManager().getMessageModel();
        //let oTempModel = this.getModel("tempModel");
        let aAll = oMsgModel.getData();
        return aAll;
    }

    public showModelErrors(bCleaned: boolean) {
        if (!bCleaned) {
            let oTempModel = this.getModel("tempModel");
            let aAll = this.getModelMessages();
            let aErrors = [];
            aErrors = this.cleanMessages(aAll);//This is to remove duplicate error/success messages
            let aMessages: any[] = [];
            aErrors.forEach(oE => {
                aMessages.push({ type: oE.type, title: oE.message, description: oE.description });
            });
            oTempModel.setProperty("/messages", aMessages);
        }
        var sId = (this as Controller).getView()?.getId();
        var oDialog = sap.ui.xmlfragment(sId ? sId : "", "au.com.iesol.po.confirmation.variancewftask.view.fragments.ErrorMessages", this) as Dialog;
        (this as Controller).getView()?.addDependent(oDialog);
        oDialog.open();
    }
    public cleanMessages(aMessages: any[]): any[] {
        let aErrors = [];
        for (var i = 0; i < aMessages.length; i++) {
            let aE = jQuery.grep(aErrors, function (oE) {
                return oE.message === aMessages[i].message ||
                    oE.message === aMessages[i].message + ".";
            });
            if (aE.length > 0) {
                continue;
            }
            aErrors.push(aMessages[i]);
        }
        return aErrors;
    }

    public onDialogClose(oEvent: Button$PressEvent, oDialogIn?: Dialog): void {

        let oDialog = oEvent ? (oEvent.getSource() as Control).getParent() as Dialog : oDialogIn;
        if(!oDialog){
            return;
        }
        oDialog.close();
        try {
            let oPage = oDialog?.getContent()[0] as Page;
            if (oPage instanceof DynamicPage) {
                oPage.destroyContent();
                oPage.destroyFooter();
                oPage.destroy();
            }
        } catch (e) { }
        oDialog.destroyContent();
        oDialog.destroy();
    }
}