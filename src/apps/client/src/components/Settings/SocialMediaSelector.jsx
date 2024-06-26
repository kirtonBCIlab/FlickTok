import { useSnapshot } from "valtio";
import globalStore from "/src/stores/global.store";
import SocialMediaIcon from "./SocialMediaIcon";

export default function SocialMediaSelector() {
  const gloablStoreSnap = useSnapshot(globalStore);

  return (
    <div className="dropdown w-full flex justify-center">
      <div
        tabIndex="0"
        role="button"
        className="btn w-1/2 flex h-full justify-stretch py-3"
      >
        <div className="flex flex-1">
          {/* Social media icon */}
          <SocialMediaIcon
            name={gloablStoreSnap.settings.selected.socialMedia}
          />
        </div>
        <div className="flex flex-1 justify-center items-center h-full">
          <div className="flex flex-col">
            {/* <span className="text-base">Social Media</span> */}
            <span className="text-sm">Social Media</span>
            <span className="text-secondary text-xs capitalize">
              {gloablStoreSnap.settings.selected.socialMedia}
            </span>
          </div>
        </div>
        <div className="flex flex-0 justify-center items-center h-full">
          {/* Dropdown arrow icon */}
          <svg
            width="12px"
            height="12px"
            className="inline-block h-3 w-3 fill-current opacity-60"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 2048 2048"
          >
            <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
          </svg>
        </div>
      </div>
      <ul
        tabIndex="0"
        className="dropdown-content bg-base-300 rounded-lg z-[1] w-1/2 p-2 shadow-2xl mt-[4.25rem]"
      >
        {Object.entries(gloablStoreSnap.settings.options.socialMedia).map(
          (v, i) => {
            const k = v[0];
            const { url, title } = v[1];
            return (
              <li key={k}>
                <input
                  type="radio"
                  name="social-media-dropdown"
                  className="social-media-controller btn btn-sm btn-block btn-ghost justify-center text-xs my-1"
                  aria-label={`${title} - ${url}`}
                  value={k}
                  checked={k === gloablStoreSnap.settings.selected.socialMedia}
                  onChange={(e) => {
                    globalStore.settings.selected.socialMedia = e.target.value;
                    e.target.blur();
                  }}
                />
              </li>
            );
          }
        )}
      </ul>
    </div>
  );
}
